var root = require('root-path')
var setup = require(root('test/setup'))
var SessionController = require(root('api/controllers/SessionController'))
var factories = require(root('test/setup/factories'))
var passport = require('passport')

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
    var req, res, mockProfile

    // this is to work around the way passport.authenticate is being used;
    // because it has a function that takes a callback and returns a function
    // instead of immediately executing, I don't know how to promisify it
    var setupTest = function (assertions) {
      assertions = spy(assertions)
      res.view = spy(function (template, attrs) {
        res.viewTemplate = template
        res.viewAttrs = attrs
        assertions()
      })
    }

    beforeEach(() => {
      req = factories.mock.request()
      res = factories.mock.response()

      mockProfile = {
        displayName: 'Lawrence Wang',
        email: 'l@lw.io',
        emails: [ { value: 'l@lw.io' } ],
        gender: 'male',
        id: '100101',
        name: 'Lawrence Wang',
        profileUrl: 'http://www.facebook.com/100101',
        provider: 'facebook'
      }

      UserSession.login = spy(UserSession.login)
      User.createFully = spy(User.createFully)

      passport.authenticate = spy(function (strategy, callback) {
        return function () {
          callback(null, mockProfile)
        }
      })

      return setup.clearDb()
    })

    it('creates a new user', done => {
      setupTest(function () {
        expect(UserSession.login).to.have.been.called()
        expect(User.createFully).to.have.been.called()
        expect(res.view).to.have.been.called()
        expect(res.viewTemplate).to.equal('popupDone')
        expect(res.viewAttrs.error).not.to.exist

        User.find('l@lw.io', {withRelated: ['linkedAccounts']})
        .then(user => {
          expect(user).to.exist
          expect(user.get('facebook_url')).to.equal('http://www.facebook.com/100101')
          var account = user.relations.linkedAccounts.find(a => a.get('provider_key') === 'facebook')
          expect(account).to.exist
          done()
        })
      })
      SessionController.finishFacebookOAuth(req, res)
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

      it('adds the new user to the community', done => {
        setupTest(function () {
          User.find('l@lw.io', {withRelated: 'communities'})
          .then(user => {
            var c = user.relations.communities.first()
            expect(c).to.exist
            expect(c.id).to.equal(community.id)
            done()
          })
        })
        SessionController.finishFacebookOAuth(req, res)
      })
    })

    describe('for an existing user', () => {
      var user

      beforeEach(() => {
        user = factories.user({active: true})
        mockProfile.email = user.get('email')
        return user.save()
      })

      it('creates a new linked account', done => {
        setupTest(function () {
          user.load('linkedAccounts')
          .then(user => {
            var account = user.relations.linkedAccounts.first()
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('facebook')
            done()
          })
        })
        SessionController.finishFacebookOAuth(req, res)
      })

      describe('with an existing Facebook account', () => {
        beforeEach(() => LinkedAccount.create(user.id, {type: 'facebook', profile: {id: 'foo'}}))

        it('leaves the existing account unchanged', done => {
          setupTest(function () {
            user.load('linkedAccounts')
            .then(user => {
              expect(user.relations.linkedAccounts.length).to.equal(1)
              var account = user.relations.linkedAccounts.first()
              expect(account.get('provider_user_id')).to.equal('foo')
              done()
            })
          })
          SessionController.finishFacebookOAuth(req, res)
        })
      })
    })
  })
})
