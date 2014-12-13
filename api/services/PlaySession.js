var cookie = require('cookie');
var crypto = require('crypto');
var qs     = require('querystring');
var _      = require('lodash');

var noop = function(x) { return x };

var PlaySession = function(request, opts) {
  opts = opts || {};
  this.secret = opts.secret || process.env.PLAY_APP_SECRET;
  if (request.headers && request.headers.cookie) {
    var sessionString = cookie.parse(request.headers.cookie, {decode: noop}).PLAY_SESSION;
    if (sessionString) {
      var i = sessionString.indexOf('-');
      this.signature = sessionString.slice(0, i);
      this.body = sessionString.slice(i + 1);
      this.data = qs.decode(this.body);
    }
  }
};

_.extend(PlaySession.prototype, {
  isValid: function() {
    if (!this.signature) return false;

    var hash = crypto.createHmac('sha1', this.secret).update(this.body).digest('hex');
    return this.signature == hash;
  },
  isExpired: function() {
    return this.data['pa.u.exp'] < new Date().getTime();
  },
  fetchUser: function(callback) {
    var providerKey = this.data['pa.p.id'], providerId = this.data['pa.u.id'];
    if (providerKey == 'password') {
      return User.where({email: providerId, active: true}).fetch();
    } else {
      return LinkedAccount.query(function(qb) {
        qb.where({
            provider_key: providerKey,
            provider_user_id: providerId,
            "users.active": true
        }).leftJoin("users", function() {
          this.on("users.id", "=", "linked_account.user_id");
        });
      }).fetch().then(function (account) {
        if (account) {
          return account.activeUser().fetch();
        } else {
          sails.log.error("PlaySession failed to retrieve linkedAccount", providerKey, providerId);
          return null;
        }
      });
    }
  }
});

module.exports = PlaySession;
