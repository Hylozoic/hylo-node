/* eslint-disable camelcase */
import { difference, intersection, isEmpty, pickBy } from 'lodash'
import { flow, filter, map, includes } from 'lodash/fp'
import {
  handleMissingTagDescriptions, throwErrorIfMissingTags
} from '../../lib/util/controllers'
import { normalizeComment } from '../../lib/util/normalize'
import { markdown } from 'hylo-utils/text'
import createAndPresentComment from '../models/comment/createAndPresentComment'
import { simpleUserColumns } from '../presenters/UserPresenter'

const checkCommentTags = (text, post, descriptions, userId) => {
  const tags = Tag.tagsInText(text)
  const describedTags = Object.keys(pickBy(descriptions, (v, k) => !!v))
  return isEmpty(difference(tags, describedTags))
    ? Promise.resolve()
    : Promise.join(
        post.load('communities'),
        Membership.where({active: true, user_id: userId})
        .query().pluck('community_id'),
        (post, communityIds) =>
          throwErrorIfMissingTags(tags, intersection(
            communityIds, post.relations.communities.pluck('id'))))
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
      {user: simpleUserColumns},
      'thanks',
      {'thanks.thankedBy': simpleUserColumns},
      'media'
    ]})
    .then(cs => cs.map(c => CommentPresenter.present(c)))
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

    return checkCommentTags(text, post, tagDescriptions, req.session.userId)
    .then(() => createAndPresentComment(req.session.userId, text, post, {
      parentComment: comment,
      tagDescriptions,
      imageUrl: req.param('imageUrl')
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

        Post.find(comment.get('post_id'))
        .then(post => Tag.updateForPost(post, null, null, null, trx)),

        comment.save({
          deactivated_by_id: req.session.userId,
          deactivated_at: new Date(),
          active: false,
          recent: false
        }, {patch: true})
        .tap(c =>
          Queue.classMethod('Post', 'updateFromNewComment', {postId: c.get('post_id')}))
    )))
    .then(() => res.ok({}), res.serverError)
  },

  update: function (req, res) {
    return Comment.find(req.param('commentId'))
    .then(comment => {
      if (!comment) return res.notFound()
      return bookshelf.transaction(function (trx) {
        return comment.save({text: req.param('text')}, {transacting: trx})
        .tap(comment =>
          Tag.updateForComment(comment, req.param('tagDescriptions'), req.session.userId, trx))
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
