var root = require('root-path')
require(root('test/setup'))
var GetImageSize = require(root('api/services/GetImageSize'))

describe('GetImageSize', () => {
  it('gets the size', () => {
    return GetImageSize('https://www.hylo.com/img/smallh.png')
    .then(dimensions => {
      expect(dimensions.width).to.equal(144)
      expect(dimensions.height).to.equal(144)
    })
  })
})
