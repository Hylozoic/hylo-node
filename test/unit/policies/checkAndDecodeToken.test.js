const rootPath = require('root-path')
require(rootPath('test/setup'))
const { mockify, unspyify } = require(rootPath('test/setup/helpers'))
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
    mockify(Email, 'decodeFormToken', () => { throw 'error' })
    checkAndDecodeToken(req, res, next)
    unspyify(Email, 'decodeFormToken')
    expect(res.badRequest).to.have.been.called()
    expect(next).not.to.have.been.called()
  })

  it('decodes a good token', () => {
    const groupId = '123'
    const userId = '321'
    req.params.token = Email.formToken(groupId, userId)

    checkAndDecodeToken(req, res, next)
    expect(res.locals.tokenData.groupId).to.equal(groupId)
    expect(res.locals.tokenData.userId).to.equal(userId)
    expect(next).to.have.been.called()
  })
})
