var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var UserController = require(root('api/controllers/UserController'))
import { spyify, unspyify } from '../../setup/helpers'

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

        return User.where({email: 'foo@bar.com'}).fetch()
      })
      .then(user => {
        expect(user.get('last_login').getTime()).to.be.closeTo(new Date().getTime(), 2000)
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

    describe('.update', function () {
      it('halts on invalid email', function () {
        _.extend(req.params, {userId: u1.id, email: 'lol'})

        return UserController.update(req, res)
        .then(() => {
          expect(res.statusCode).to.equal(422)
          expect(res.body).to.equal(sails.__('invalid-email'))
        })
      })

      it('halts on duplicate email', function () {
        _.extend(req.params, {userId: u1.id, email: u2.get('email')})

        return UserController.update(req, res)
        .then(() => {
          expect(res.statusCode).to.equal(422)
          expect(res.body).to.equal(sails.__('duplicate-email'))
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

      it('only updates changed fields in settings', function () {
        _.extend(req.params, {userId: u1.id, settings: {currentCommunityId: 'all'}})

        return UserController.update(req, res)
        .then(() => User.find(u1.id))
        .then(user => {
          expect(user.get('settings')).to.deep.equal({leftNavIsOpen: true, currentCommunityId: 'all'})
        })
      })
    })

    describe('.findSelf', function () {
      beforeEach(() => spyify(Admin, 'isSignedIn', () => true))
      afterEach(() => unspyify(Admin, 'isSignedIn'))

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
          expect(response.is_admin).to.exist
          expect(response.email).to.exist
        })
      })
    })

    describe('.findOne', () => {
      beforeEach(() => spyify(Admin, 'isSignedIn', () => true))
      afterEach(() => unspyify(Admin, 'isSignedIn'))

      it('returns a response without private details', () => {
        var response
        req.session.userId = u1.id
        req.params.userId = u1.id
        _.extend(res, {
          ok: spy(data => response = data),
          serverError: spy(function (err) {
            console.error(err)
            console.error(err.stack)
          })
        })

        return UserController.findOne(req, res).then(function () {
          expect(res.ok).to.have.been.called()
          expect(res.serverError).not.to.have.been.called()
          expect(response.communities).to.deep.equal([])
          expect(response.people).to.deep.equal([])
          expect(response.id).to.equal(u1.id)
          expect(response.name).to.equal(u1.get('name'))
          expect(response.is_admin).not.to.exist
          expect(response.email).not.to.exist
        })
      })
    })
  })

  describe('.contributions', () => {
    var u1, u2, c

    before(() => {
      u1 = factories.user()
      u2 = factories.user()
      c = factories.community()
      return Promise.join(u1.save(), u2.save(), c.save())
      .then(() => Promise.join(u1.joinCommunity(c), u2.joinCommunity(c)))
    })

    it('works for other users', () => {
      req.session.userId = u1.id
      req.params.userId = u2.id
      return UserController.contributions(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
        expect(res.body.toJSON()).to.deep.equal([])
      })
    })

    it('works for oneself', () => {
      req.session.userId = u1.id
      req.params.userId = u1.id
      return UserController.contributions(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
        expect(res.body.toJSON()).to.deep.equal([])
      })
    })
  })

  describe('.thanks', () => {
    var u1, u2, c, cm, p

    beforeEach(() => {
      u1 = factories.user()
      u2 = factories.user()
      c = factories.community()
      p = factories.post()
      cm = factories.comment()
      return Promise.join(u1.save(), u2.save(), c.save(), p.save(), cm.save())
      .then(() => cm.save({post_id: p.id, user_id: u2.id}))
      .then(() => Promise.join(
        u1.joinCommunity(c), u2.joinCommunity(c), p.communities().attach(c)
      ))
    })

    it('works for other users', () => {
      req.session.userId = u1.id
      req.params.userId = u2.id

      return new Thank({
        comment_id: cm.id,
        user_id: u2.id,
        thanked_by_id: u1.id,
        date_thanked: new Date()
      }).save()
      .then(() => UserController.thanks(req, res))
      .then(() => {
        expect(res.ok).to.have.been.called()
        const response = res.body.toJSON()
        expect(response.length).to.equal(1)
        expect(response[0].comment).to.contain({
          id: cm.id,
          text: cm.get('text'),
          post_id: p.id
        })
        expect(response[0].thankedBy).to.contain({
          id: u1.id,
          name: u1.get('name'),
          avatar_url: u1.get('avatar_url')
        })
        expect(response[0].user_id).to.equal(u2.id)
      })
    })

    it('works for oneself', () => {
      req.session.userId = u2.id
      req.params.userId = u2.id

      return new Thank({
        comment_id: cm.id,
        user_id: u2.id,
        thanked_by_id: u1.id,
        date_thanked: new Date()
      }).save()
      .then(() => UserController.thanks(req, res))
      .then(() => {
        expect(res.ok).to.have.been.called()
        const response = res.body.toJSON()
        expect(response.length).to.equal(1)
        expect(response[0].comment).to.contain({
          id: cm.id,
          text: cm.get('text'),
          post_id: p.id
        })
        expect(response[0].thankedBy).to.contain({
          id: u1.id,
          name: u1.get('name'),
          avatar_url: u1.get('avatar_url')
        })
        expect(response[0].user_id).to.equal(u2.id)
      })
    })
  })
})
