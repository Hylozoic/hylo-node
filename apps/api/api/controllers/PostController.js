const { GraphQLYogaError } = require('@graphql-yoga/node')
import { includes } from 'lodash'
import createPost from '../models/post/createPost'
import { joinRoom, leaveRoom } from '../services/Websockets'

const PostController = {
  createFromEmailForm: function (req, res) {
    const { tokenData: { userId, groupId } } = res.locals
    const namePrefixes = {
      offer: "I'd like to share",
      request: "I'm looking for",
      resource: "I'd like to share",
      intention: "I'd like to create"
    }

    const type = req.param('type')
    if (!includes(Object.keys(namePrefixes), type)) {
      return res.serverError(new GraphQLYogaError(`invalid type: ${type}`))
    }

    const attributes = {
      created_from: 'email_form',
      name: `${namePrefixes[type]} ${req.param('name')}`,
      group_ids: [groupId],
      topicNames: [type],
      description: req.param('description')
    }

    let group
    return Post.where({name: attributes.name, user_id: userId}).fetch()
    .then(post => {
      if (post && (new Date() - post.get('created_at') < 5 * 60000)) {
        res.redirect(Frontend.Route.post(post))
        return true
      }
    })
    .then(stop => stop || Group.find(groupId)
      .then(g => {
        group = g
        if (!g.get('active')) {
          const message = 'Your post was not created. That group no longer exists.'
          res.redirect(Frontend.Route.root() + `?notification=${encodeURIComponent(message)}&error=1`)
          return true
        }
      }))
    .then(stop => stop || createPost(userId, attributes)
      .then(post => {
        Analytics.track({
          userId,
          event: 'Add Post by Email Form',
          properties: {group: group.get('name')}
        })
        return post
      })
      .then(post => res.redirect(Frontend.Route.post(post, group))))
    .catch(res.serverError)
  },

  updateLastRead: async function (req, res) {
    try {
      await res.locals.post.markAsRead(req.session.userId)
      res.ok({})
    } catch (err) {
      res.serverError(err)
    }
  },

  subscribe: function (req, res) {
    joinRoom(req, res, 'post', res.locals.post.id)
  },

  unsubscribe: function (req, res) {
    leaveRoom(req, res, 'post', res.locals.post.id)
  },

  typing: function (req, res) {
    const { post } = res.locals
    const { body: { isTyping }, socket } = req

    return User.find(req.session.userId)
    .then(user => post.pushTypingToSockets(user.id, user.get('name'), isTyping, socket))
    .then(() => res.ok({}))
  },

  subscribeToUpdates: function (req, res) {
    joinRoom(req, res, 'user', req.session.userId)
  },

  unsubscribeFromUpdates: function (req, res) {
    leaveRoom(req, res, 'user', req.session.userId)
  }
}

module.exports = PostController
