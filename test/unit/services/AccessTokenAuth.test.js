var setup = require('../../setup')
import factories from '../../setup/factories'

describe('AccessTokenAuth', function () {
  describe('.generateToken', () => {
    it('generates a 48 character string', () => {
      return AccessTokenAuth.generateToken()
      .then(token => {
        expect(token.length).to.equal(48)
      })
    })
  })

  describe('.checkAndSetAuthenticated', () => {
    var userWithToken, generatedToken = '1234'

    before(() => {
      setup.clearDb()
      UserSession.login = spy(UserSession.login)
      return factories.user()
      .save()
      .then(u => {
        userWithToken = u
        return LinkedAccount.create(u.id, {type: 'token',token: generatedToken})
      })
    })

    it('will set the user based on the access token from the req.body', () => {
      var req = factories.mock.request()
      req.body.access_token = generatedToken
      AccessTokenAuth.checkAndSetAuthenticated(req)
      .then(() => {
        expect(UserSession.login).to.have.been.called()
        expect(req.session.userId).to.equal(userWithToken.id)
        expect(req.session.authenticated).to.be.true
      })
    })
    
    it('will set the user based on the access token from the query params', () => {
      var req = factories.mock.request()
      req.query.access_token = generatedToken
      AccessTokenAuth.checkAndSetAuthenticated(req)
      .then(() => {
        expect(UserSession.login).to.have.been.called()
        expect(req.session.userId).to.equal(userWithToken.id)
        expect(req.session.authenticated).to.be.true
      })
    })
    
    it('will set the user based on the x-access-token from the request header', () => {
      var req = factories.mock.request()
      req.headers['x-access-token'] = generatedToken
      AccessTokenAuth.checkAndSetAuthenticated(req)
      .then(() => {
        expect(UserSession.login).to.have.been.called()
        expect(req.session.userId).to.equal(userWithToken.id)
        expect(req.session.authenticated).to.be.true
      })
    })
    
    it('does nothing if no token is specified', () => {
      var req = factories.mock.request()
      AccessTokenAuth.checkAndSetAuthenticated(req)
      .then(() => {
        expect(req.session.authenticated).to.equal(undefined)
        expect(req.session.userId).to.equal(undefined)
      })
    })
    
    it('does nothing if no user is found with that token', () => {
      var req = factories.mock.request()
      req.query.access_token = '4321'
      AccessTokenAuth.checkAndSetAuthenticated(req)
      .then(() => {
        expect(req.session.authenticated).to.equal(undefined)
        expect(req.session.userId).to.equal(undefined)
      })
    })
  })
})