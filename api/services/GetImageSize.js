var imageSize = require('image-size')
var Promise = require('bluebird')
var request = require('request')

module.exports = function (imageUrl) {
  return new Promise((resolve, reject) => {
    request(imageUrl, {encoding: null}, (error, resp, body) => {
      if (error) return reject(error)

      if (resp.statusCode !== 200) {
        return reject('Get Image Size on ' + imageUrl + ' failed with status code: ' + resp.statusCode)
      }
      resolve(imageSize(resp.body, 'binary'))
    })
  })
}
