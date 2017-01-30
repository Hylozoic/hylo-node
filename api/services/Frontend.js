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

module.exports = {
  Route: {
    prefix,

    root: () => url('/app'),

    community: function (community) {
      return url('/c/%s', community.get('slug'))
    },

    communitySettings: function (community) {
      return this.community(community) + '/settings'
    },

    communityJoinRequests: function (community) {
      return this.community(community) + '/invite#join_requests'
    },

    profile: function (user) {
      return url('/u/%s', user.id)
    },

    post: function (post) {
      return url(`/p/${post.id}`)
    },

    thread: function (post) {
      return url(`/t/${post.id}`)
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
    }
  }
}
