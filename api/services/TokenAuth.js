const crypto = require('crypto')
const Promise = require('bluebird')

var TokenAuth = module.exports = {

  generateToken: function() {
    const randomBytes = Promise.promisify(crypto.randomBytes)
    return randomBytes(24).then(buffer => buffer.toString('hex'))
  },

  checkAndSetAuthenticated: function(req) {
    req.body = req.body || {}
    const token = req.body.access_token || req.query.access_token || req.headers['x-access-token']
    if (!token) return Promise.resolve()
    return User.query(function (qb) {
       qb.leftJoin('tokens', 'users.id', 'tokens.user_id')
       qb.where('tokens.token', '=', token)
    })
    .fetch()
    .then(user => {
      if (user) {
        req.session = req.session || {}
        req.session.authenticated = true
        req.session.userId = user.id
      }
    })
  },

  isAuthenticated: function(req) {
    return req.session && req.session.authenticated
  }

}
