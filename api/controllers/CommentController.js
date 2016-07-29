import { difference, isEmpty, pickBy } from 'lodash'
import {
  handleMissingTagDescriptions, throwErrorIfMissingTags
} from '../../lib/util/controllers'
import { sanitize } from 'hylo-utils/text'

const userColumns = q => q.column('id', 'name', 'avatar_url')

const updateRecentComments = postId =>
  Queue.classMethod('Post', 'setRecentComments', {postId})

const createComment = function (commenterId, text, post, tagDescriptions) {
  text = sanitize(text)
  var attrs = {
    text: text,
    created_at: new Date(),
    post_id: post.id,
    user_id: commenterId,
    active: true
  }

  return post.load('followers')
  .then(() => {
    const mentioned = RichText.getUserMentions(text)
    const existingFollowers = post.relations.followers.pluck('id')
    const newFollowers = _.difference(_.uniq(mentioned.concat(commenterId)), existingFollowers)

    return bookshelf.transaction(function (trx) {
      return new Comment(attrs).save(null, {transacting: trx})
      .tap(comment => Tag.updateForComment(comment, tagDescriptions, trx))
      .tap(() => post.updateCommentCount(trx))
    })
    .tap(comment => comment.createActivities())
    .tap(comment => post.addFollowers(newFollowers, commenterId))
    .tap(() => updateRecentComments(post.id))
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
  findForPost: function (req, res) {
    Comment.query(function (qb) {
      qb.where({post_id: res.locals.post.id, active: true})
      qb.orderBy('id', 'asc')
    }).fetchAll({withRelated: [
      {user: userColumns},
      'thanks',
      {'thanks.thankedBy': userColumns}
    ]})
    .then(cs => cs.map(c => CommentPresenter.present(c, req.session.userId)))
    .then(res.ok, res.serverError)
  },

  create: function (req, res) {
    const text = req.param('text')
    const post = res.locals.post
    const tagDescriptions = req.param('tagDescriptions')

    return checkCommentTags(text, post, tagDescriptions)
    .then(() => createComment(req.session.userId, text, post, tagDescriptions))
    .then(comment => comment.load({user: userColumns}))
    .then(c => CommentPresenter.present(c, req.session.userId))
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
        const text = Comment.cleanEmailText(user, req.param('stripped-text'))
        return createComment(replyData.userId, text, post)
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
          deactivated_on: new Date(),
          active: false,
          recent: false
        }, {patch: true}).tap(c => updateRecentComments(c.get('post_id')))
    )))
    .then(() => res.ok({}), res.serverError)
  }
}
