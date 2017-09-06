/* globals UploadController */

var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('UploadController', () => {
  var req, res

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()

    req.headers['content-type'] = 'application/x-www-form-urlencoded'
    req.body = ''
  })

  it('returns an error if the request has no url and no file data', () => {
    return UploadController.create(req, res)
    .then(() => {
      expect(res.statusCode).to.equal(422)
      expect(res.body.error).to.equal("The request didn't contain any file data")
    })
  })

  it('returns an error if the request has a bad type', () => {
    req.params.url = 'http://foo.com/foo.png'
    return UploadController.create(req, res)
    .then(() => {
      expect(res.body.error).to.equal('Validation error: Invalid type')
    })
  })
})
