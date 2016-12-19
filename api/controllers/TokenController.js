const Promise = require('bluebird')

module.exports = {
  create: function (req, res) {
    return Token.findForUser(req.session.userId)
    .then(token => token ? Promise.reject(new Error('User already has a token generated')) : Promise.resolve())
    .then(() => TokenAuth.generateToken())
    .then(token => new Token({token, user_id: req.session.userId}).save())
    .then(token => res.ok({token: token.get('token')}))
    .catch(function (err) {
      res.status(422).send(err.detail ? err.detail : err)
    })
  },
  destroy: function (req, res) {
    return Token.findForUser(req.session.userId)
    .then(token => token ? token.destroy() : Promise.reject(new Error('No token has been generated')))
    .then(() => res.ok({}))
    .catch(function (err) {
      res.status(422).send(err.detail ? err.detail : err)
    })
  }
}
