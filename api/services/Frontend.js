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
    community: function (community) {
      return url('/c/%s', community.get('slug'))
    },

    profile: function (user) {
      return url('/u/%s', user.id)
    },

    project: function (project) {
      return url('/project/%s/%s', project.id, project.get('slug'))
    },

    projectSettings: function (project) {
      return url('/project/%s/settings', project.get('slug'))
    },

    post: function (post) {
      return url(`/p/${post.id}`)
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

    useInvitation: function (token) {
      return url('/h/use-invitation?token=%s', token)
    }
  }
}
