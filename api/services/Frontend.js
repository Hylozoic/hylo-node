var prefix = format('%s://%s', process.env.PROTOCOL, process.env.DOMAIN);

var url = function() {
  var args = Array.prototype.slice.call(arguments);
  args[0] = prefix + args[0];
  return format.apply(null, args);
}

module.exports = {

  Route: {
    community: function(community) {
      return url('/c/%s', community.get('slug'));
    },

    profile: function(user) {
      return url('/u/%s', user.id);
    },

    post: function(post, community) {
      return url('/c/%s/s/%s', community.get('slug'), post.id);
    },

    unfollow: function(post, community) {
      return this.post(post, community) + '?action=unfollow';
    },

    userSettings: function() {
      return url('/settings');
    },

    tokenLogin: function(user, token) {
      return url('/noo/login/token?u=%s&t=%s', user.id, token);
    },

    error: function(key) {
      return url('/error?key=' + encodeURIComponent(key));
    },

    useInvitation: function(token) {
      return url('/h/use-invitation?token=%s', token);
    }
  }

};