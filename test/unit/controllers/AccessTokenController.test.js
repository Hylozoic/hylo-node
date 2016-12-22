var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var AccessTokenController = require(root('api/controllers/AccessTokenController'))
var nock = require('nock')
var Promise = require('bluebird')

describe('AccessTokenController', () => {
  var userWithoutToken, userWithToken, req, res

  before(() => setup.clearDb())

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    return Promise.join(
        factories.user()
        .save()
        .then(u => {
            userWithToken = u
            return LinkedAccount.create(u.id, {type: 'token',token: '1234'})
        }),
        factories.user()
        .save()
        .then(u => userWithoutToken = u))
  })

  describe('#create', () => {
    it('generates an accessToken for a user', () => {
      req.login(userWithoutToken.id)
      return AccessTokenController.create(req, res)
      .then(() => {
        return LinkedAccount.tokenForUser(userWithoutToken.id)
        .then(linkedAccount => {
          expect(linkedAccount).to.exist
          expect(res.ok).to.have.been.called()
          expect(res.body).to.deep.equal({
            accessToken: linkedAccount.get('provider_user_id')
          })
          expect(linkedAccount.get('user_id')).to.equal(userWithoutToken.id)
          expect(linkedAccount.get('provider_key')).to.equal('token')
        })
      })
    })
    
    it('errors when user already has an accessToken', () => {
      req.login(userWithToken.id)
      return AccessTokenController.create(req, res)
      .then(() => {
        expect(res.statusCode).to.equal(422)
        expect(res.body).to.equal('User already has a token generated')
      })
    })
  })
  
  describe('#destroy', () => {
    it('deletes an accessToken for a user', () => {
      req.login(userWithToken.id)
      return AccessTokenController.destroy(req, res)
      .then(() => {
        return LinkedAccount.tokenForUser(userWithToken.id)
        .then(linkedAccount => {
          expect(linkedAccount).not.to.exist
          expect(res.ok).to.have.been.called()
          expect(res.body).to.deep.equal({})
        })
      })
    })
    
    it('errors when user doesnt have an accessToken', () => {
      req.login(userWithoutToken.id)
      return AccessTokenController.destroy(req, res)
      .then(() => {
        expect(res.statusCode).to.equal(422)
        expect(res.body).to.equal('No token has been generated')
      })
    })
  })
})
