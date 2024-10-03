import { isString, isNumber, isEmpty } from 'lodash'

/*

This file exists because we sometimes need to refer to URL's that live in the
Angular app. Better to contain all that kind of coupling here than to spread it
throughout the code.

*/

let prefix = `${process.env.PROTOCOL}://${process.env.DOMAIN}`
const isTesting = process.env.NODE_ENV === 'test'

const url = function () {
  // allow these values to be changed in individual tests
  if (isTesting) {
    prefix = `${process.env.PROTOCOL}://${process.env.DOMAIN}`
  }
  const args = Array.prototype.slice.call(arguments)
  args[0] = prefix + args[0]
  return format.apply(null, args)
}

const getModelId = function (model) {
  let id
  // If it's a number, than we just passed the ID in straight
  if (isString(model) || isNumber(model)) {
    id = model
  } else if (model) {
    id = model.id
  }

  return id
}

const getSlug = function (group) {
  let slug
  if (isString(group)) { // In case we passed just the slug in instead of group object
    slug = group
  } else if (group) {
    slug = group.slug || group.get('slug')
  }

  return slug
}

const getTopicName = function (topic) {
  let name
  if (isString(topic)) { // In case we passed just the name in instead of group object
    name = topic
  } else if (topic) {
    name = topic.name || topic.get('name')
  }

  return name
}

module.exports = {
  getSlug,
  Route: {
    evo: {
      passwordSetting: function () {
        return url('/settings/account')
      },

      paymentSettings: function (opts = {}) {
        switch (opts.registered) {
          case 'success':
            return url('/settings/payment?registered=success')
          case 'error':
            return url('/settings/payment?registered=error')
          default:
            return url('/settings/payment')
        }
      }
    },

    prefix,

    root: () => url('/app'),

    // Just using the regular url for chats in mobile will keep directing to a mobile UI with poor UX, so we need a specific url to flag it as a chat early
    chatPostForMobile: function (post, group, topic) {
      const groupSlug = getSlug(group)
      if (isEmpty(groupSlug) || !topic) return this.post(post) // fallback but all chats ought to have a group
      const groupUrl = `/groups/${groupSlug}/topics/${topic}`
      return url(`${groupUrl}/?postId=${getModelId(post)}`)
    },

    comment: function ({ comment, groupSlug, post }) {
      const groupUrl = isEmpty(groupSlug) ? '/all' : `/groups/${groupSlug}`

      const postId = comment?.relations?.post?.id || post.id
      return url(`${groupUrl}/post/${postId}/comments/${comment.id}`)
    },

    group: function (group) {
      return url('/groups/%s', getSlug(group))
    },

    groupRelationships: function (group) {
      return this.group(group) + '/groups'
    },

    groupSettings: function (group) {
      return this.group(group) + '/settings'
    },

    groupJoinRequests: function (group) {
      return this.groupSettings(group) + '/requests'
    },

    groupRelationshipInvites: function(group) {
      return this.groupSettings(group) + '/relationships#invites'
    },

    groupRelationshipJoinRequests: function(group) {
      return this.groupSettings(group) + '/relationships#join_requests'
    },

    invitePath: function (group) {
      return `/groups/${getSlug(group)}/join/${group.get('access_code')}`
    },

    mapPost: function (post, context, slug) {
      let contextUrl = '/all'

      if (context === 'public') {
        contextUrl = '/public'
      } else if (context === 'groups') {
        contextUrl = `/groups/${slug}`
      }

      return url(`${contextUrl}/map/post/${getModelId(post)}`)
    },

    notificationsSettings: function () {
      return url('/notifications')
    },

    profile: function (user, group) {
      if (group) {
        return url(`/groups/${getSlug(group)}/members/${getModelId(user)}`)
      }
      return url(`/members/${getModelId(user)}`)
    },

    post: function (post, group, isPublic, topic) {
      const groupSlug = getSlug(group)
      let groupUrl = '/all'

      if (isPublic) {
        groupUrl = '/public'
      } else if (!isEmpty(groupSlug)) {
        groupUrl = `/groups/${groupSlug}` + (topic ? `/topics/${topic}` : '')
      }
      return url(`${groupUrl}/post/${getModelId(post)}`)
    },

    signup: (error) => {
      return url('/signup?error=%s', error)
    },

    signupFinish: () => {
      return url('/signup/finish')
    },

    thread: function (post) {
      return url(`/messages/${getModelId(post)}`)
    },

    topic: function (group, topic) {
      return url(`/groups/${getSlug(group)}/topics/${getTopicName(topic)}`)
    },

    unfollow: function (post, group) {
      return this.post(post, group) + '?action=unfollow'
    },

    userSettings: function () {
      return url('/settings')
    },

    jwtLogin: function (user, token, nextUrl) {
      return url('/noo/login/jwt?u=%s&token=%s&n=%s',
        user.id, token, encodeURIComponent(nextUrl || ''))
    },

    tokenLogin: function (user, token, nextUrl) {
      return url('/noo/login/token?u=%s&t=%s&n=%s',
        user.id, token, encodeURIComponent(nextUrl || ''))
    },

    error: function (key) {
      return url('/error?key=' + encodeURIComponent(key))
    },

    useInvitation: function (token, email) {
      return url('/h/use-invitation?token=%s&email=%s', token, encodeURIComponent(email))
    },

    verifyEmail: function(email, token) {
      return url('/signup/verify-email?email=%s&token=%s', encodeURIComponent(email), token)
    },

    emailPostForm: function () {
      return url('/noo/hook/postForm')
    },

    emailBatchCommentForm: function () {
      return url('/noo/hook/batchCommentForm')
    }
  }
}
