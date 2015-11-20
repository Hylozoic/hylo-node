var root = require('root-path')
require(root('test/setup'))
var GetImageSize = require(root('api/services/GetImageSize'))

describe('GetImageSize', () => {
  it('gets the size when http', () => {
    return GetImageSize('http://i.huffpost.com/gen/672963/images/r-610894252-large570.jpg')
    .then(dimensions => {
      expect(dimensions.width).to.equal(570)
      expect(dimensions.height).to.equal(238)
    })
  })

  it('gets the size when https', () => {
    return GetImageSize('https://www.hylo.com/img/smallh.png')
    .then(dimensions => {
      expect(dimensions.width).to.equal(144)
      expect(dimensions.height).to.equal(144)
    })
  })
})
