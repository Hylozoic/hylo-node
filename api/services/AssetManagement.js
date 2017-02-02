const aws = require('aws-sdk')
const crypto = require('crypto')
const gm = require('gm')
const mime = require('mime')
const path = require('path')
const Promise = require('bluebird')
const request = require('request')

const basename = url => {
  const name = path.basename(url).replace(/(\?.*|[ %+])/g, '')
  return name === '' ? crypto.randomBytes(2).toString('hex') : name
}

module.exports = {
  copyAsset: function (instance, modelName, attr) {
    const subfolder = attr.replace('_url', '')
    const url = instance.get(attr)
    const key = path.join(modelName.toLowerCase(), instance.id, subfolder, basename(url))
    const newUrl = process.env.AWS_S3_CONTENT_URL + '/' + key
    const s3 = new aws.S3()
    const httpget = Promise.promisify(request.get, request, {multiArgs: true})

    sails.log.info('from: ' + url)
    sails.log.info('to:   ' + newUrl)

    if (url !== newUrl) {
      return httpget({url, encoding: null})
      .then(([ resp, body ]) => s3.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        ACL: 'public-read',
        ContentType: mime.lookup(key),
        Key: key,
        Body: body
      }).promise())
      .then(() => instance.save({[attr]: newUrl}, {patch: true}))
    }
  },

  resizeAsset: function (instance, fromAttr, toAttr, settings = {}) {
    const { width, height, transacting } = settings
    const s3 = new aws.S3()
    const url = instance.get(fromAttr)
    const key = url.replace(process.env.AWS_S3_CONTENT_URL + '/', '')
    const newKey = key.replace(/(\.\w{2,4})?$/, `-resized${width}x${height}$1`)
    const newUrl = process.env.AWS_S3_CONTENT_URL + '/' + newKey

    sails.log.info('from: ' + url)
    sails.log.info('to:   ' + newUrl)

    const httpget = Promise.promisify(request.get, request, {multiArgs: true})

    return httpget({url, encoding: null})
    .then(([ resp, body ]) => {
      const resize = gm(body)
      .resize(width, height, '>') // do not resize if already smaller
      .stream()

      return s3.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        ACL: 'public-read',
        ContentType: mime.lookup(key),
        Key: newKey,
        Body: resize
      }).promise()
      .then(() => instance.save({[toAttr]: newUrl}, {patch: true, transacting}))
    })
  }
}
