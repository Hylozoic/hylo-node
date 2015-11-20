var imageSize = require('image-size')
var Promise = require('bluebird')
var request = require('request')

module.exports = function (imageUrl) {
  return new Promise((resolve, reject) => {
    request(imageUrl, {encoding: null}, (error, resp, body) => {
      if (error) {
        reject(error)
      }
      if (resp.statusCode !== 200) {
        reject('Status Code: ', resp.statusCode)
      }
      resolve(imageSize(resp.body, 'binary'))
    })
  })
}
