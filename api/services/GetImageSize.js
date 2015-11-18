var imageSize = require('image-size')
var Promise = require('bluebird')
var url = require('url')
var http = require('http')

module.exports = function (image_url) {
  return new Promise(function (resolve, reject) {
    var options = url.parse(image_url)
    http.get(options, function (response) {
      var chunks = []
      response.on('data', function (chunk) {
        chunks.push(chunk)
      }).on('end', function () {
        var buffer = Buffer.concat(chunks)
        resolve(imageSize(buffer))
      })
    })
  })
}
