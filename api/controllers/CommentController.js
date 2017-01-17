import { difference, isEmpty, pickBy } from 'lodash'
import { flow, filter, map, includes } from 'lodash/fp'
import {
  handleMissingTagDescriptions, throwErrorIfMissingTags
} from '../../lib/util/controllers'
import { normalizeComment } from '../../lib/util/normalize'
import { sanitize, markdown } from 'hylo-utils/text'

const userColumns = q => q.column('id', 'name', 'avatar_url')

const updateRecentComments = postId =>
  Queue.classMethod('Post', 'updateFromNewComment', {postId})

const presentComment = (comment) =>
  comment.load({user: userColumns})
  .then(c => CommentPresenter.present(c, c.get('user_id')))
  .then(c => {
    const buckets = {people: []}
    normalizeComment(c, buckets, true)
    return Object.assign(buckets, c)
  })

const createAndPresentComment = function (commenterId, text, post, opts = {}) {
  text = sanitize(text)

  const { parentComment } = opts

  const isReplyToPost = !parentComment

  var attrs = {
    text: text,
    created_at: new Date(),
    user_id: commenterId,
    post_id: post.id,
    active: true,
    created_from: opts.created_from || null
  }

  if (!isReplyToPost) {
    attrs.comment_id = parentComment.id
  }

  return (isReplyToPost ? post.load('followers') : parentComment.load('followers'))
  .then(() => {
    var existingFollowers, isThread
    const mentioned = RichText.getUserMentions(text)

    if (isReplyToPost) {
      existingFollowers = post.relations.followers.pluck('id')
      isThread = post.get('type') === Post.Type.THREAD
    } else {
      existingFollowers = parentComment.relations.followers.pluck('id')
      isThread = false
    }

    const newFollowers = _.difference(_.uniq(mentioned.concat(commenterId)), existingFollowers)

    return bookshelf.transaction(trx =>
      new Comment(attrs).save(null, {transacting: trx})
      .tap(comment => Tag.updateForComment(comment, opts.tagDescriptions, trx))
      .tap(() => isReplyToPost && post.updateCommentCount(trx)))
    .then(comment => Promise.all([
      presentComment(comment)
      .tap(c => isReplyToPost &&
        (isThread
        ? post.pushMessageToSockets(c, existingFollowers)
        : post.pushCommentToSockets(c))),

      (isThread
        ? Queue.classMethod('Comment', 'notifyAboutMessage', {commentId: comment.id})
        : comment.createActivities()),

      (isReplyToPost
        ? post.addFollowers(newFollowers, commenterId)
        : Promise.join(comment.addFollowers(newFollowers, commenterId),
            parentComment.addFollowers(newFollowers, commenterId))),

      isReplyToPost && updateRecentComments(post.id)
    ]))
    .then(promises => promises[0])
  })
}

const checkCommentTags = (text, post, descriptions) => {
  const tags = Tag.tagsInText(text)
  const describedTags = Object.keys(pickBy(descriptions, (v, k) => !!v))
  return isEmpty(difference(tags, describedTags))
    ? Promise.resolve()
    : post.load('communities').then(() =>
        throwErrorIfMissingTags(tags, post.relations.communities.pluck('id')))
}

module.exports = {
  findForParent: function (req, res) {
    const { beforeId, afterId, limit, newest } = req.allParams()
    const comment_id = res.locals.comment ? res.locals.comment.id : null
    return Comment.query(q => {
      q.where({post_id: res.locals.post.id, comment_id, active: true})
      if (beforeId) q.where('id', '<', beforeId)
      if (afterId) q.where('id', '>', afterId)
      if (limit) q.limit(limit)
      q.orderBy('id', newest ? 'desc' : 'asc')
    }).fetchAll({withRelated: [
      {user: userColumns},
      'thanks',
      {'thanks.thankedBy': userColumns}
    ]})
    .then(cs => cs.map(c => CommentPresenter.present(c, req.session.userId)))
    .then(comments => {
      const buckets = {people: []}
      comments.forEach((c, i) => normalizeComment(c, buckets, i === comments.length - 1))
      return Object.assign(buckets, {comments})
    })
    .then(res.ok, res.serverError)
  },

  create: function (req, res) {
    const text = req.param('text')
    const { post, comment } = res.locals
    const tagDescriptions = req.param('tagDescriptions')

    return checkCommentTags(text, post, tagDescriptions)
    .then(() => createAndPresentComment(req.session.userId, text, post, {
      parentComment: comment,
      tagDescriptions
    }))
    .then(res.ok)
    .catch(err => {
      if (handleMissingTagDescriptions(err, res)) return
      res.serverError(err)
    })
  },

  createFromEmail: function (req, res) {
    try {
      var replyData = Email.decodePostReplyAddress(req.param('To'))
    } catch (e) {
      return res.serverError(new Error('Invalid reply address: ' + req.param('To')))
    }

    return Post.find(replyData.postId, {withRelated: 'communities'})
    .then(post => {
      if (!post) return
      const community = post.relations.communities.first()
      Analytics.track({
        userId: replyData.userId,
        event: 'Post: Comment: Add by Email',
        properties: {
          post_id: post.id,
          community: community && community.get('name')
        }
      })
      return User.find(replyData.userId).then(user => {
        const text = Comment.cleanEmailText(user, req.param('stripped-text'), {
          useMarkdown: !post.isThread()
        })
        return createAndPresentComment(replyData.userId, text, post, {created_from: 'email'})
      })
    })
    .then(() => res.ok({}), res.serverError)
  },

  thank: function (req, res) {
    Comment.find(req.param('commentId'), {withRelated: [
      {thanks: q => q.where('thanked_by_id', req.session.userId)}
    ]})
    .then(comment => {
      const thank = comment.relations.thanks.first()
      return thank
        ? thank.destroy()
        : Thank.create(comment, req.session.userId)
    })
    .then(() => res.ok({}), res.serverError)
  },

  destroy: function (req, res) {
    Comment.find(req.param('commentId'))
    .then(comment =>
      bookshelf.transaction(trx => Promise.join(
        Activity.removeForComment(comment.id, trx),

        Post.query().where('id', comment.get('post_id'))
        .decrement('num_comments', 1).transacting(trx),

        comment.save({
          deactivated_by_id: req.session.userId,
          deactivated_at: new Date(),
          active: false,
          recent: false
        }, {patch: true}).tap(c => updateRecentComments(c.get('post_id')))
    )))
    .then(() => res.ok({}), res.serverError)
  },

  update: function (req, res) {
    return Comment.find(req.param('commentId'))
    .then(comment => {
      if (!comment) return res.notFound()
      return bookshelf.transaction(function (trx) {
        return comment.save({text: req.param('text')}, {transacting: trx})
        .tap(comment => Tag.updateForComment(comment, req.param('tagDescriptions'), trx))
      })
      .then(res.ok, res.serverError)
    })
  },

  createBatchFromEmailForm: function (req, res) {
    const { communityId, userId } = res.locals.tokenData

    const replyText = postId => markdown(req.param(`post-${postId}`))

    const postIds = flow(
      Object.keys,
      filter(k => k.match(/^post-(\d)+$/)),
      map(k => k.replace(/^post-/, ''))
    )(req.allParams())

    var failures = false

    return Community.find(communityId)
    .then(community => Promise.map(postIds, id => {
      if (isEmpty(replyText(id))) return
      return Post.find(id, {withRelated: ['communities']})
      .then(post => {
        if (!post || !includes(communityId, post.relations.communities.pluck('id'))) {
          failures = true
          return Promise.resolve()
        }
        return Comment.where({user_id: userId, post_id: post.id, text: replyText(post.id)}).fetch()
        .then(comment => {
          if (post && (new Date() - post.get('created_at') < 5 * 60000)) return

          Analytics.track({
            userId,
            event: 'Post: Comment: Add by Email Form',
            properties: {
              post_id: post.id,
              community: community && community.get('name')
            }
          })
          return createAndPresentComment(userId, replyText(post.id), post, {created_from: 'email batch form'})
          .then(() => Post.updateFromNewComment({postId: post.id}))
        })
      })
    })
    .then(() => {
      var notification
      if (failures) {
        notification = 'Some of your comments could not be added.'
      } else {
        notification = 'Your comments have been added.'
      }
      return res.redirect(Frontend.Route.community(community) +
        `?notification=${notification}${failures ? '&error=true' : ''}`)
    }, res.serverError))
  }
}
