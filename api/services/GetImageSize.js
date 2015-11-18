var imageSize = require('image-size')
var Promise = require('bluebird')
var url = require('url')
var http = require('http')
var https = require('https')

module.exports = function (image_url) {
  return new Promise(function (resolve, reject) {
    var options = url.parse(image_url)
    var protocol = (options.protocol === 'https:' ? https : http)
    protocol.get(options, function (response) {
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
