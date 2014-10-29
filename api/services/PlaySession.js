var cookie = require('cookie');
var crypto = require('crypto');

var noop = function(x) { return x };

var PlaySession = function(request, opts) {
  opts = opts || {};
  this.secret = opts.secret || process.env.PLAY_APP_SECRET;
  if (request.headers && request.headers.cookie) {
    var sessionString = cookie.parse(request.headers.cookie, {decode: noop}).PLAY_SESSION;
    var i = sessionString.indexOf('-');
    this.signature = sessionString.slice(0, i);
    this.body = sessionString.slice(i + 1);
  }
};

PlaySession.prototype.isValid = function() {
  if (!this.signature) return false;

  var hash = crypto.createHmac('sha1', this.secret).update(this.body).digest('hex');
  return this.signature == hash;
};

// this works only if you have the Play application secret in your env
PlaySession.test = function() {
  var request = {headers: {cookie: 'ajs_anonymous_id=%222661d4fa-df2a-47f9-9818-03104073ac8b%22; PLAY_SESSION="b2324baa4061f419cb944dfd4e927a5f7da049c6-pa.u.exp=1415742115467&pa.p.id=password&pa.u.id=l%40lw.io"; ajs_group_id=null; ajs_user_id=301'}};
  var session = new PlaySession(request);
  return session.isValid();
}

module.exports = PlaySession;