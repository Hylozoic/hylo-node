const Promise = require('bluebird')

module.exports = {
  create: function (req, res) {
    return LinkedAccount.tokenForUser(req.session.userId)
    .then(account => !account || Promise.reject(new Error('User already has a token generated')))
    .then(() => AccessTokenAuth.generateToken())
    .then(token => LinkedAccount.create(req.session.userId, {type: 'token', token}))
    .then(account => res.ok({accessToken: account.get('provider_user_id')}))
    .catch(err => {
      res.status(422).send(err.detail || err.message || err)
    })
  },
  destroy: function (req, res) {
    return LinkedAccount.tokenForUser(req.session.userId)
    .then(account => account ? account.destroy() : Promise.reject(new Error('No token has been generated')))
    .then(() => res.ok({}))
    .catch(err => {
      res.status(422).send(err.detail || err.message || err)
    })
  }
}
