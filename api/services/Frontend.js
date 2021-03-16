import { isString, isNumber, isEmpty } from 'lodash'

/*

This file exists because we sometimes need to refer to URL's that live in the
Angular app. Better to contain all that kind of coupling here than to spread it
throughout the code.

*/

let prefix = `${process.env.PROTOCOL}://${process.env.DOMAIN}`
const isTesting = process.env.NODE_ENV === 'test'

var url = function () {
  // allow these values to be changed in individual tests
  if (isTesting) {
    prefix = `${process.env.PROTOCOL}://${process.env.DOMAIN}`
  }
  var args = Array.prototype.slice.call(arguments)
  args[0] = prefix + args[0]
  return format.apply(null, args)
}

var getModelId = function (model) {
  let id
  // If it's a number, than we just passed the ID in straight
  if (isString(model) || isNumber(model)) {
    id = model
  } else if (model) {
    id = model.id
  }

  return id
}

var getSlug = function (group) {
  let slug
  if (isString(group)) { // In case we passed just the slug in instead of group object
    slug = group
  } else if (group) {
    slug = group.slug || group.get('slug')
  }

  return slug
}

module.exports = {
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

    comment: function (comment, group) {
      // TODO: update to use comment specific url when implemented in frontend
      let groupSlug = getSlug(group)

      let groupUrl = isEmpty(groupSlug) ? '/all' : `/groups/${groupSlug}`

      const postId = comment.relations.post.id

      return url(`${groupUrl}/post/${postId}`)
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
      return url(`/groups/${getSlug(group)}/join/${group.get('access_code')}`)
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

    profile: function (user) {
      return url(`/members/${getModelId(user)}`)
    },

    post: function (post, group, isPublic) {
      let groupSlug = getSlug(group)
      let groupUrl = '/all'

      if (isPublic) {
        groupUrl = '/public'
      } else if (!isEmpty(groupSlug)) {
        groupUrl = `/groups/${groupSlug}`
      }

      return url(`${groupUrl}/p/${getModelId(post)}`)
    },

    thread: function (post) {
      return url(`/messages/${getModelId(post)}`)
    },

    unfollow: function (post, group) {
      return this.post(post, group) + '?action=unfollow'
    },

    userSettings: function () {
      return url('/settings')
    },

    tokenLogin: function (user, token, nextUrl) {
      return url('/noo/login/token?u=%s&t=%s&n=%s',
        user.id, token, encodeURIComponent(nextUrl || ''))
    },

    error: function (key) {
      return url('/error?key=' + encodeURIComponent(key))
    },

    useInvitation: function (token, email) {
      return url('/h/use-invitation?token=%s&email=%s', token, email)
    },

    emailPostForm: function () {
      return url('/noo/hook/postForm')
    },

    emailBatchCommentForm: function () {
      return url('/noo/hook/batchCommentForm')
    }
  }
}
