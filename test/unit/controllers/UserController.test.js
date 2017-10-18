var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var UserController = require(root('api/controllers/UserController'))

describe('UserController', function () {
  var req, res

  beforeEach(function () {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
  })

  describe('.create', function () {
    var community

    beforeEach(function () {
      Object.assign(res, {
        send: console.error
      })

      UserSession.login = spy(UserSession.login)
      User.create = spy(User.create)

      community = new Community({beta_access_code: 'foo', name: 'foo', slug: 'foo'})
      return community.save()
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
      u1 = factories.user({settings: {leftNavIsOpen: true, currentCommunityId: '7'}})
      u2 = factories.user()
      return Promise.join(u1.save(), u2.save())
    })

    describe('.create', () => {
      it('halts on duplicate email', function () {
        Object.assign(req.params, {email: u2.get('email')})

        return UserController.create(req, res)
        .then(() => {
          expect(res.statusCode).to.equal(422)
          expect(res.body).to.equal(req.__('duplicate-email'))
        })
      })
    })
  })
})
