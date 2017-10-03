import { isString, isNumber, get, isEmpty } from 'lodash'

/*

This file exists because we sometimes need to refer to URL's that live in the
Angular app. Better to contain all that kind of coupling here than to spread it
throughout the code.

*/

const prefix = `${process.env.PROTOCOL}://${process.env.DOMAIN}`

var url = function () {
  var args = Array.prototype.slice.call(arguments)
  args[0] = prefix + args[0]
  return format.apply(null, args)
}

var getModelId = function(model) {
  let id
  // If it's a number, than we just passed the ID in straight
  if (isString(model) || isNumber(model)) {
    id = model
  } else if (model) {
    id = model.id
  }

  return id
}

var getSlug = function(community) {
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
      }
    },

    prefix,

    root: () => url('/app'),

    community: function (community) {
      return url('/c/%s', getSlug(community))
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
