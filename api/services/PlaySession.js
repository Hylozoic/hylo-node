var cookie = require('cookie'),
  crypto = require('crypto'),
  qs = require('querystring'),
  _ = require('lodash');

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
  fetchUser: function() {
    var providerKey = this.providerKey(), providerId = this.providerId();

    if (!providerKey || !providerId)
      return Promise.resolve(null);

    if (providerKey == 'password') {
      return User.query(function(qb) {
        qb.whereRaw('lower(email) = lower(?) and active = ?', [providerId.toLowerCase(), true]);
      }).fetch();
    }

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
  },
  providerKey: function() {
    return this.data['pa.p.id'];
  },
  providerId: function() {
    return this.data['pa.u.id'];
  }
});

module.exports = PlaySession;
