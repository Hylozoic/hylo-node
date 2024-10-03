const crypto = require('crypto')
const Promise = require('bluebird')

var AccessTokenAuth = module.exports = {

  generateToken: function() {
    const randomBytes = Promise.promisify(crypto.randomBytes)
    return randomBytes(24).then(buffer => buffer.toString('hex'))
  },

  checkAndSetAuthenticated: function(req) {
    req.body = req.body || {}
    const token = req.body.access_token || req.query.access_token || req.headers['x-access-token']
    if (!token) return Promise.resolve()
    return User.query(function (qb) {
       qb.leftJoin('linked_account', 'users.id', 'linked_account.user_id')
       qb.where('linked_account.provider_user_id', '=', token)
       qb.andWhere('linked_account.provider_key', '=', 'token')
    })
    .fetch()
    .then(user => !user || UserSession.login(req, user, 'token'))
  }

}
