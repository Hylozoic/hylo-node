var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var UserController = require(root('api/controllers/UserController'))
import jwt from 'jsonwebtoken'

describe('UserController', function () {
  var req, res

  beforeEach(function () {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
  })

  describe('.create', function () {
    var group

    beforeEach(function () {
      Object.assign(res, {
        send: console.error
      })

      UserSession.login = spy(UserSession.login)
      User.create = spy(User.create)

      group = new Group({access_code: 'foo', name: 'foo', slug: 'foo', group_data_type: 1 })
      return group.save()
    })

    it('works with a username and password', function () {
      Object.assign(req.params, {
        email: 'foo@bar.com',
        password: 'password!',
        code: 'foo',
        login: true
      })

      return UserController.create(req, res).then(function () {
        expect(res.status).not.to.have.been.called()
        expect(User.create).to.have.been.called()
        expect(UserSession.login).to.have.been.called()
        expect(res.ok).to.have.been.called()

        return User.where({email: 'foo@bar.com'}).fetch()
      })
      .then(user => {
        expect(user.get('last_login_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
      })
    })
  })

  describe('with an existing user', function () {
    var u1, u2

    beforeEach(function () {
      u1 = factories.user({settings: {leftNavIsOpen: true, currentGroupId: '7'}})
      u2 = factories.user()
      return Promise.join(u1.save(), u2.save())
    })

    describe('.create', () => {
      it('halts on duplicate email', function () {
        Object.assign(req.params, {email: u2.get('email')})

        return UserController.create(req, res)
        .then(() => {
          expect(res.statusCode).to.equal(422)
          expect(res.body).to.deep.equal({ error: 'duplicate-email' })
        })
      })
    })
  })

  describe('.sendEmailVerification', function () {
    let u1

    beforeEach(function () {
      u1 = factories.user()
      return u1.save()
    })

    it ('checks if user with email already exists', () => {
      req.params.email = u1.get('email')
      return UserController.sendEmailVerification(req, res).then(function () {
        expect(res.statusCode).to.equal(422)
        expect(res.body).to.deep.equal({ error: "duplicate-email" })
      })
    })

    it ('creates a user verification code', () => {
      req.params.email = 'new@email.com'
      UserVerificationCode.create = spy(UserVerificationCode.create)
      Queue.classMethod = spy(Queue.classMethod)

      return UserController.sendEmailVerification(req, res).then(function () {
        expect(res.ok).to.have.been.called()
        expect(UserVerificationCode.create).to.have.been.called()
        expect(Queue.classMethod).to.have.been.called()
      })
    })
  })

  describe('.verifyEmailByCode', function () {
    let code
    beforeEach(async () => {
      code = await UserVerificationCode.create('new@email.com')
    })

    it ('returns forbidden on invalid code', () => {
      req.params.email = code.get('email')
      req.params.code = '12345'
      return UserController.verifyEmailByCode(req, res).then(function () {
        expect(res.status).to.have.been.called.with(403)
        expect(res.body).to.deep.equal({ error: 'invalid code' })
      })
    })

    it ('sets cookie on valid code', async () => {
      req.params.email = code.get('email')
      req.params.code = code.get('code')
      return UserController.verifyEmailByCode(req, res).then(function () {
        expect(res.ok).to.have.been.called()
        expect(res.body).to.equal(code.get('email'))
        expect(res.cookies.verifiedEmail).to.equal(code.get('email'))
      })
    })
  })

  describe('.verifyEmailByToken', function () {
    let code

    beforeEach(async () => {
      code = await UserVerificationCode.create('new@email.com')
    })

    it ('returns error on invalid token', () => {
      req.params.token = jwt.sign({
        iss: 'https://hylo.com/moo',
        aud: 'https://hylo.com',
        sub: code.get('email'),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration
        code: code.get('code')
      }, process.env.JWT_SECRET);

      return UserController.verifyEmailByToken(req, res).then(function () {
        expect(res.redirect).to.have.been.called()
        expect(res.redirected).to.equal(Frontend.Route.signup('invalid-link'))
      })
    })

    it ('sets cookie on valid token', async () => {
      req.params.token = jwt.sign({
        iss: 'https://hylo.com',
        aud: 'https://hylo.com',
        sub: code.get('email'),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration
        code: code.get('code')
      }, process.env.JWT_SECRET);

      return UserController.verifyEmailByToken(req, res).then(function () {
        expect(res.redirect).to.have.been.called()
        expect(res.redirected).to.equal(Frontend.Route.signupFinish())
        expect(res.cookies.verifiedEmail).to.equal(code.get('email'))
      })
    })
  })

})
