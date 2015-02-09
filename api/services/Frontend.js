var format = require('util').format,
  prefix = format('%s://%s', process.env.PROTOCOL, process.env.DOMAIN);

var url = function() {
  var args = Array.prototype.slice.call(arguments);
  args[0] = prefix + args[0];
  return format.apply(null, args);
}

module.exports = {

  Route: {
    profile: function(user) {
      return url('/u/%s', user.id);
    },

    seed: function(seed, community) {
      return url('/c/%s/s/%s', community.get('slug'), seed.id);
    },

    unfollow: function(seed) {
      return url('/email/unfollow/%s', seed.id);
    }
  }

}