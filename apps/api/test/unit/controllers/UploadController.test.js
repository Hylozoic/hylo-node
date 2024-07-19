/* globals UploadController */

var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('UploadController', () => {
  var req, res

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('uploading via x-www-form-urlencoded', () => {
    beforeEach(() => {
      req.headers['content-type'] = 'application/x-www-form-urlencoded'
    })

    it('returns an error if the request has no url', () => {
      req.body = 'type=userAvatar'
      return UploadController.create(req, res)
      .then(() => {
        expect(res.body.error).to.equal('Validation error: No url and no stream')
      })
    })

    it('returns an error if the request has a bad type', () => {
      req.body = 'url=http://foo.com/foo.png'
      return UploadController.create(req, res)
      .then(() => {
        expect(res.body.error).to.equal('Validation error: Invalid type')
      })
    })
  })

  describe('uploading via json', () => {
    beforeEach(() => {
      req.headers['content-type'] = 'application/json'
    })

    it('returns an error if the request has no url', () => {
      req.params.type = 'userAvatar'
      return UploadController.create(req, res)
      .then(() => {
        expect(res.body.error).to.equal('Validation error: No url and no stream')
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

  describe('uploading via file', () => {
    beforeEach(() => {
      req.headers['content-type'] = 'multipart/form-data; boundary=125b0ae93a754d0ba988b98b397d587f'
    })

    it('parses a multipart request', () => {
      req.body = testMultipartBody
      req.session.userId = '42'
      return UploadController.create(req, res)
      .then(() => {
        // this error is thrown by createS3StorageStream; the fact that it is
        // thrown confirms that busboy was able to parse the request and set up
        // the stream pipeline.
        expect(res.body.type).to.equal('userAvatar')
      })
    })
  })
})

// the spec requires the use of CRLF (\r\n), not just \n
// https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
const testMultipartBody = `--125b0ae93a754d0ba988b98b397d587f\r
Content-Disposition: form-data; name="type"\r
\r
userAvatar\r
--125b0ae93a754d0ba988b98b397d587f\r
Content-Disposition: form-data; name="id"\r
\r
42\r
--125b0ae93a754d0ba988b98b397d587f\r
Content-Disposition: form-data; name="text"; filename="hello.txt"\r
\r
hello world\r
we come in peace\r
\r
--125b0ae93a754d0ba988b98b397d587f--\r
`
