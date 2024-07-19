/* eslint-disable camelcase */
import { isEmpty } from 'lodash'
import { flow, filter, map, includes } from 'lodash/fp'
import { TextHelpers } from 'hylo-shared'
import createComment from '../models/comment/createComment'

module.exports = {
  createFromEmail: function (req, res) {
    try {
      var replyData = Email.decodePostReplyAddress(req.param('To'))
    } catch (e) {
      return res.status(422).send('Invalid reply address: ' + req.param('To'))
    }

    return Promise.join(
      Post.find(replyData.postId, {withRelated: 'groups'}),
      User.find(replyData.userId),
      (post, user) => {
        if (!post) return res.status(422).send('valid token, but post not found')
        if (!user) return res.status(422).send('valid token, but user not found')

        const group = post.relations.groups.first()
        Analytics.track({
          userId: replyData.userId,
          event: 'Post: Comment: Add by Email',
          properties: {
            post_id: post.id,
            group: group && group.get('name')
          }
        })

        const text = Comment.cleanEmailText(user, req.param('stripped-text'), {
          useMarkdown: !post.isThread()
        })
        return createComment(replyData.userId, {text, post, created_from: 'email'})
        .then(() => res.ok({}), res.serverError)
      }
    )
  },

  createBatchFromEmailForm: function (req, res) {
    // TODO: fix
    const { groupId, userId } = res.locals.tokenData

    const replyText = postId => TextHelpers.markdown(req.param(`post-${postId}`, { disableAutolinking: true }))

    const postIds = flow(
      Object.keys,
      filter(k => k.match(/^post-(\d)+$/)),
      map(k => k.replace(/^post-/, ''))
    )(req.allParams())

    var failures = false

    return Group.find(groupId)
    .then(group => Promise.map(postIds, id => {
      if (isEmpty(replyText(id))) return
      return Post.find(id, {withRelated: ['groups']})
      .then(post => {
        if (!post || !includes(groupId, post.relations.groups.pluck('id'))) {
          failures = true
          return Promise.resolve()
        }
        if (post && (new Date() - post.get('created_at') < 5 * 60000)) return

        return Comment.where({
          user_id: userId,
          post_id: post.id,
          text: replyText(post.id)
        }).fetch()
        .then(comment => {
          // comment with this text already exists
          if (comment) return

          return createComment(userId, {
            text: replyText(post.id),
            post,
            created_from: 'email batch form'
          })
          .then((newComment) => {
            Analytics.track({
              userId,
              event: 'Post: Comment: Add by Email Form',
              properties: {
                post_id: post.id,
                group: group && group.get('name'),
                comment_id: newComment.id
              }
            })

            // TODO: then this function is getting called twice, that ok?
            return Post.updateFromNewComment({
              postId: post.id,
              commentId: comment.id
            })
          })
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
      return res.redirect(Frontend.Route.group(group) +
        `?notification=${notification}${failures ? '&error=true' : ''}`)
    }, res.serverError))
  }
}
