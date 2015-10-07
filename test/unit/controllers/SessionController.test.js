var root = require('root-path')
require(root('test/setup'))
var SessionController = require(root('api/controllers/SessionController'))
var factories = require(root('test/setup/factories'))

describe('SessionController', function () {
  var req, res, cat

  before(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('.create', function () {
    before(() => {
      _.extend(req, {
        params: {
          email: 'iam@cat.org',
          password: 'password'
        }
      })

      cat = new User({name: 'Cat', email: 'iam@cat.org'})
      return cat.save().then(() =>
        new LinkedAccount({
          provider_user_id: '$2a$10$UPh85nJvMSrm6gMPqYIS.OPhLjAMbZiFnlpjq1xrtoSBTyV6fMdJS',
          provider_key: 'password',
          user_id: cat.id
        }).save())
    })

    it('works with a valid username and password', function () {
      return SessionController.create(req, res)
      .then(() => User.find(cat.id))
      .then(user => {
        expect(res.status).not.to.have.been.called()
        expect(res.ok).to.have.been.called()
        expect(req.session.userId).to.equal(cat.id)
        expect(user.get('last_login').getTime()).to.be.closeTo(new Date().getTime(), 2000)
      })
    })
  })

  describe('.createWithToken', () => {
    var user, token

    before(() => {
      UserSession.login = spy(UserSession.login)
      user = factories.user()
      return user.save({created_at: new Date()})
      .then(() => user.generateToken())
      .then(t => token = t)
    })

    it('logs a user in and redirects', () => {
      _.extend(req.params, {u: user.id, t: token})

      return SessionController.createWithToken(req, res)
      .then(() => {
        expect(UserSession.login).to.have.been.called()
        expect(res.redirect).to.have.been.called()
        expect(res.redirected).to.equal(Frontend.Route.userSettings() + '?expand=password')
      })
    })

    it('rejects an invalid token', () => {
      var error
      _.extend(req.params, {u: user.id, t: token + 'x'})
      res.send = spy(function (msg) { error = msg })

      return SessionController.createWithToken(req, res)
      .then(() => {
        expect(res.send).to.have.been.called()
        expect(error).to.equal("Token doesn't match")
      })
    })
  })
})
