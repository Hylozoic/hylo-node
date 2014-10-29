var cookie = require('cookie');
var crypto = require('crypto');

var noop = function(x) { return x };

var PlaySession = function(request, opts) {
  opts = opts || {};
  this.secret = opts.secret || process.env.PLAY_APP_SECRET;
  if (request.headers.cookie)
    this.sessionString = cookie.parse(request.headers.cookie, {decode: noop}).PLAY_SESSION;
};

PlaySession.prototype.isValid = function() {
  if (!this.sessionString) return false;

  var i = this.sessionString.indexOf('-'),
    signature = this.sessionString.slice(0, i),
    body = this.sessionString.slice(i + 1),
    hash = crypto.createHmac('sha1', this.secret).update(body).digest('hex');

  return signature == hash;
};

// this works only if you have the Play application secret in your env
PlaySession.test = function() {
  var request = {headers: {cookie: 'ajs_anonymous_id=%222661d4fa-df2a-47f9-9818-03104073ac8b%22; PLAY_SESSION="b2324baa4061f419cb944dfd4e927a5f7da049c6-pa.u.exp=1415742115467&pa.p.id=password&pa.u.id=l%40lw.io"; ajs_group_id=null; ajs_user_id=301'}};
  var session = new PlaySession(request);
  return session.isValid();
}

module.exports = PlaySession;