var root = require('root-path')
require(root('test/setup'))
var GetImageSize = require(root('api/services/GetImageSize'))

describe('GetImageSize', () => {
  it('gets the size', function () {
    this.timeout(5000)
    return GetImageSize('https://www.hylo.com/favicon.png')
    .then(dimensions => {
      expect(dimensions.width).to.equal(32)
      expect(dimensions.height).to.equal(32)
    })
  })
})
