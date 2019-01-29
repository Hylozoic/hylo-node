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

var getSlug = function (community) {
  let slug
  if (isString(community)) { // In case we passed just the slug in instead of community object
    slug = community
  } else if (community) {
    slug = community.slug || community.get('slug')
  }

  return slug
}

module.exports = {
  Route: {
    evo: {
      passwordSetting: function () {
        return url('/settings/password')
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

    community: function (community) {
      return url('/c/%s', getSlug(community))
    },

    comment: function (comment, community) {
      // TODO: update to use comment specific url when implemented in frontend
      let communitySlug = getSlug(community)

      let communityUrl = isEmpty(communitySlug) ? '/all' : `/c/${communitySlug}`

      const postId = comment.relations.post.id

      return url(`${communityUrl}/p/${postId}`)
    },

    communitySettings: function (community) {
      return this.community(community) + '/settings'
    },

    communityJoinRequests: function (community) {
      return this.communitySettings(community) + '/invite#join_requests'
    },

    profile: function (user) {
      return url(`/m/${getModelId(user)}`)
    },

    post: function (post, community) {
      let communitySlug = getSlug(community)

      let communityUrl = isEmpty(communitySlug) ? '/all' : `/c/${communitySlug}`

      return url(`${communityUrl}/p/${getModelId(post)}`)
    },

    thread: function (post) {
      return url(`/t/${getModelId(post)}`)
    },

    unfollow: function (post, community) {
      return this.post(post, community) + '?action=unfollow'
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
    },

    invitePath: function (community) {
      return `/c/${getSlug(community)}/join/${community.get('beta_access_code')}`
    }
  }
}
