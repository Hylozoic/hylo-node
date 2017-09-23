const rootPath = require('root-path')
require(rootPath('test/setup'))
const checkAndDecodeToken = require(rootPath('api/policies/checkAndDecodeToken'))
const factories = require(rootPath('test/setup/factories'))

describe('checkAndDecodeToken', function () {
  var req, res, next

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    res.badRequest = spy()
    next = spy()
  })

  it('rejects a bad token', () => {
    req.params.token = 'abadtoken'
    return checkAndDecodeToken(req, res, next)
    .then(() => {
      expect(res.badRequest).to.have.been.called()
      expect(next).not.to.have.been.called()
    })
  })

  it('decodes a good token', () => {
    const communityId = '123'
    const userId = '321'
    req.params.token = Email.formToken(communityId, userId)

    return checkAndDecodeToken(req, res, next)
    .then(() => {
      expect(res.locals.tokenData.communityId).to.equal(communityId)
      expect(res.locals.tokenData.userId).to.equal(userId)
      expect(next).to.have.been.called()
    })
  })
})
