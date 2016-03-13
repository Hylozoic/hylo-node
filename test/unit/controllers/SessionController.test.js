const setup = require('../../setup')
const SessionController = require('../../../api/controllers/SessionController')
var factories = require('../../setup/factories')
var passport = require('passport')

describe('SessionController.findUser', () => {
  var u1, u2
  var findUser = SessionController.findUser

  before(() => {
    u1 = factories.user()
    u2 = factories.user()
    return Promise.all([u1.save(), u2.save()])
  })

  describe('with no directly linked user', () => {
    it('picks a user with matching email address', () => {
      return findUser('facebook', u2.get('email'), 'foo')
      .then(user => {
        expect(user.id).to.equal(u2.id)
      })
    })
  })

  describe('with a directly linked user', () => {
    before(() => {
      return LinkedAccount.create(u1.id, {type: 'facebook', profile: {id: 'foo'}})
    })

    after(() => {
      return LinkedAccount.query().where('user_id', u1.id).del()
    })

    it('returns that user, not one with a matching email address', () => {
      return findUser('facebook', u2.get('email'), 'foo')
      .then(user => {
        expect(user.id).to.equal(u1.id)
      })
    })
  })
})

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

  describe('.finishFacebookOAuth', () => {
    var req, res, origPassportAuthenticate

    var mockProfile = {
      displayName: 'Lawrence Wang',
      email: 'l@lw.io',
      emails: [ { value: 'l@lw.io' } ],
      gender: 'male',
      id: '100101',
      name: 'Lawrence Wang',
      profileUrl: 'http://www.facebook.com/100101',
      provider: 'facebook'
    }

    const expectMatchMockProfile = userId => {
      return User.find(userId, {withRelated: 'linkedAccounts'})
      .then(user => {
        var account = user.relations.linkedAccounts.first()
        expect(account).to.exist
        expect(account.get('provider_key')).to.equal('facebook')
        expect(user.get('facebook_url')).to.equal(mockProfile.profileUrl)
        expect(user.get('avatar_url')).to.equal('http://graph.facebook.com/100101/picture?type=large')
        return user
      })
    }

    before(() => {
      origPassportAuthenticate = passport.authenticate
    })

    beforeEach(() => {
      req = factories.mock.request()
      res = factories.mock.response()

      UserSession.login = spy(UserSession.login)
      User.createFully = spy(User.createFully)

      passport.authenticate = spy(function (strategy, callback) {
        return () => callback(null, mockProfile)
      })

      return setup.clearDb()
    })

    afterEach(() => {
      passport.authenticate = origPassportAuthenticate
    })

    it('creates a new user', () => {
      return SessionController.finishFacebookOAuth(req, res)
      .then(() => {
        expect(UserSession.login).to.have.been.called()
        expect(User.createFully).to.have.been.called()
        expect(res.view).to.have.been.called()
        expect(res.viewTemplate).to.equal('popupDone')
        expect(res.viewAttrs.error).not.to.exist

        return User.find('l@lw.io', {withRelated: 'linkedAccounts'})
      })
      .then(user => {
        expect(user).to.exist
        expect(user.get('facebook_url')).to.equal('http://www.facebook.com/100101')
        var account = user.relations.linkedAccounts.find(a => a.get('provider_key') === 'facebook')
        expect(account).to.exist
      })
    })

    describe('with no user in the third-party response', () => {
      beforeEach(() => {
        passport.authenticate = spy(function (strategy, callback) {
          return () => callback(null, null)
        })
      })

      it('sets an error in the view parameters', () => {
        return SessionController.finishFacebookOAuth(req, res)
        .then(() => {
          expect(res.view).to.have.been.called()
          expect(res.viewAttrs.error).to.equal('no user')
        })
      })
    })

    describe('with an invitation', () => {
      var community

      beforeEach(() => {
        community = factories.community()
        return Promise.join(community.save(), factories.user().save())
        .spread((community, inviter) => Invitation.create({
          communityId: community.id,
          userId: inviter.id,
          email: 'foo@bar.com'
        }))
        .tap(invitation => req.session.invitationId = invitation.id)
      })

      it('adds the new user to the community', () => {
        return SessionController.finishFacebookOAuth(req, res)
        .then(() => User.find('l@lw.io', {withRelated: ['communities', 'followedPosts', 'followedPosts.relatedUsers']}))
        .then(user => {
          var c = user.relations.communities.first()
          expect(c).to.exist
          expect(c.id).to.equal(community.id)

          var welcome = user.relations.followedPosts.first()
          expect(welcome).to.exist
          expect(welcome.get('type')).to.equal('welcome')

          var relatedUser = welcome.relations.relatedUsers.first()
          expect(relatedUser).to.exist
          expect(relatedUser.id).to.equal(user.id)
        })
      })
    })

    describe('for an existing user', () => {
      var user

      beforeEach(() => {
        user = factories.user()
        mockProfile.email = user.get('email')
        return user.save()
      })

      it('creates a new linked account', () => {
        return SessionController.finishFacebookOAuth(req, res)
        .then(() => expectMatchMockProfile(user.id))
      })

      describe('with an existing Facebook account', () => {
        beforeEach(() => LinkedAccount.create(user.id, {type: 'facebook', profile: {id: 'foo'}}))

        it('leaves the existing account unchanged', () => {
          return SessionController.finishFacebookOAuth(req, res)
          .then(() => user.load('linkedAccounts'))
          .then(user => {
            expect(user.relations.linkedAccounts.length).to.equal(1)
            var account = user.relations.linkedAccounts.first()
            expect(account.get('provider_user_id')).to.equal('foo')
          })
        })
      })
    })

    describe('for a logged-in user', () => {
      var user

      beforeEach(() => {
        user = factories.user()
        return user.save().then(() => req.login(user.id))
      })

      it('creates a new linked account even if the email does not match', () => {
        return SessionController.finishFacebookOAuth(req, res)
        .then(() => expectMatchMockProfile(user.id))
      })

      describe('with a linked account that belongs to a different user', () => {
        var account
        beforeEach(() => {
          return factories.user().save()
          .then(u2 => LinkedAccount.create(u2.id, {type: 'facebook', profile: {id: mockProfile.id}}))
          .tap(a => account = a)
        })

        it('changes ownership', () => {
          return SessionController.finishFacebookOAuth(req, res)
          .then(() => expectMatchMockProfile(user.id))
          .then(user => expect(user.relations.linkedAccounts.first().id).to.equal(account.id))
        })
      })
    })
  })
})
