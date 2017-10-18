/* eslint-disable camelcase */
import { isEmpty } from 'lodash'
import { flow, filter, map, includes } from 'lodash/fp'
import { markdown } from 'hylo-utils/text'
import createAndPresentComment from '../models/comment/createAndPresentComment'

module.exports = {
  createFromEmail: function (req, res) {
    try {
      var replyData = Email.decodePostReplyAddress(req.param('To'))
    } catch (e) {
      return res.status(422).send('Invalid reply address: ' + req.param('To'))
    }

    return Promise.join(
      Post.find(replyData.postId, {withRelated: 'communities'}),
      User.find(replyData.userId),
      (post, user) => {
        if (!post) return res.status(422).send('valid token, but post not found')
        if (!user) return res.status(422).send('valid token, but user not found')

        const community = post.relations.communities.first()
        Analytics.track({
          userId: replyData.userId,
          event: 'Post: Comment: Add by Email',
          properties: {
            post_id: post.id,
            community: community && community.get('name')
          }
        })

        const text = Comment.cleanEmailText(user, req.param('stripped-text'), {
          useMarkdown: !post.isThread()
        })
        return createAndPresentComment(replyData.userId, text, post, {created_from: 'email'})
        .then(() => res.ok({}), res.serverError)
      }
    )
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
        return Comment.where({
          user_id: userId,
          post_id: post.id,
          text: replyText(post.id)
        }).fetch()
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
          return createAndPresentComment(userId, replyText(post.id), post,
            {created_from: 'email batch form'})
          .then(() => Post.updateFromNewComment({
            postId: post.id,
            commentId: comment.id
          }))
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
