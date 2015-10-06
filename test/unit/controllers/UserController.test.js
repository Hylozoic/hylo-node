var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var UserController = require(root('api/controllers/UserController'))

describe('UserController', function () {
  var noop = () => () => this
  var req, res

  beforeEach(function () {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
  })

  describe('.create', function () {
    var community

    beforeEach(function () {
      _.extend(res, {
        send: console.error
      })

      UserSession.login = spy(UserSession.login)
      User.create = spy(User.create)

      community = new Community({beta_access_code: 'foo', name: 'foo', slug: 'foo'})
      return community.save()
    })

    it('works with a username and password', function () {
      _.extend(req.params, {
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

        return User.where({email: 'foo@bar.com'}).fetch({withRelated: ['onboarding']})
      })
        .then(function (user) {
          var onboarding = user.relations.onboarding
          expect(onboarding).not.to.be.null
          expect(onboarding.get('user_id')).to.equal(user.id)
          expect(onboarding.get('type')).to.equal('onboarding')
          expect(onboarding.get('status').step).to.equal('start')

          expect(user.get('last_login').getTime()).to.be.closeTo(new Date().getTime(), 2000)
        })
    })

    describe('with an invitation to a community', function () {
      var invitation

      beforeEach(() => {
        var inviter = new User({email: 'inviter@foo.com'})
        return inviter.save()
        .then(() => Invitation.create({
          communityId: community.id,
          userId: inviter.id,
          email: 'foo@bar.com'
        }))
        .tap(i => invitation = i)
      })

      it('works', function () {
        _.extend(req.params, {
          email: 'foo@bar.com',
          password: 'password!',
          login: true
        })
        req.session.invitationId = invitation.id

        return UserController.create(req, res).then(function () {
          expect(res.status).not.to.have.been.called()
          expect(User.create).to.have.been.called()
          expect(UserSession.login).to.have.been.called()
          expect(res.ok).to.have.been.called()

          return User.where({email: 'foo@bar.com'}).fetch({withRelated: ['communities']})
        })
        .then(user => {
          var community = user.relations.communities.first()
          expect(community).to.exist
          expect(community.get('name')).to.equal('foo')
        })
      })
    })
  })

  describe('with an existing user', function () {
    var u1, u2

    beforeEach(function () {
      u1 = new User({email: 'foo@bar.com', active: true})
      u2 = new User({email: 'foo2@bar2.com', active: true})
      return Promise.join(u1.save(), u2.save())
    })

    describe('.update', function () {
      it('halts on invalid email', function () {
        _.extend(req.params, {userId: u1.id, email: 'lol'})

        res.badRequest = spy(function (message) {
          expect(message).to.equal(sails.__('invalid-email'))
        })

        return UserController.update(req, res)
        .then(() => {
          expect(res.badRequest).to.have.been.called()
        })
      })

      it('halts on duplicate email', function () {
        _.extend(req.params, {userId: u1.id, email: u2.get('email')})

        res.badRequest = spy(function (message) {
          expect(message).to.equal(sails.__('duplicate-email'))
        })

        return UserController.update(req, res)
        .then(() => {
          expect(res.badRequest).to.have.been.called()
        })
      })

      it('only updates changed fields', function () {
        var fields, options
        _.extend(req.params, {userId: u1.id, twitter_name: 'ev'})

        res = {
          ok: spy(noop()),
          serverError: function (err) {
            console.error(err)
            console.error(err.stack)
          }
        }

        User.trueFind = User.find
        User.find = function (id) {
          return Promise.resolve(id === u1.id ? u1 : null)
        }

        u1.save = spy(function (f, o) {
          fields = f
          options = o
        })

        return UserController.update(req, res).then(function () {
          expect(u1.save).to.have.been.called()
          expect(_.omit(fields, 'updated_at')).to.eql({twitter_name: 'ev'})
          expect(options).to.eql({patch: true})
        })
          .finally(function () {
            User.find = User.trueFind
          })
      })

      it('updates skills', function () {
        _.extend(req.params, {userId: u1.id, skills: ['standing', 'sitting']})

        res = {
          ok: function () {
            u1.load('skills').then(function (user) {
              expect(Skill.simpleList(user.relations.skills).sort()).to.eql(['sitting', 'standing'])
            })
          }
        }

        return UserController.update(req, res)
      })
    })

    describe('.findSelf', function () {
      it('returns a response with private details', function () {
        var response
        req.session.userId = u1.id
        _.extend(res, {
          ok: spy(data => response = data),
          serverError: spy(function (err) {
            console.error(err)
            console.error(err.stack)
          })
        })

        return UserController.findSelf(req, res).then(function () {
          expect(res.ok).to.have.been.called()
          expect(res.serverError).not.to.have.been.called()
          expect(response.notification_count).to.exist
        })
      })
    })
  })
})
