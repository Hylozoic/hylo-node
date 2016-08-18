const aws = require('aws-sdk')
const crypto = require('crypto')
const gm = require('gm')
const mime = require('mime')
const path = require('path')
const Promise = require('bluebird')
const request = require('request')
const s3stream = require('s3-upload-stream')(new aws.S3())

const promisifyStream = stream =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', err =>
      err instanceof Error ? reject(err) : reject(new Error(err)))
  })

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

    sails.log.info('from: ' + url)
    sails.log.info('to:   ' + newUrl)

    if (url !== newUrl) {
      const copy = request(url).pipe(s3stream.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        ACL: 'public-read',
        ContentType: mime.lookup(key),
        Key: key
      }))

      return promisifyStream(copy)
      .then(() => instance.save({[attr]: newUrl}, {patch: true}))
    }
  },

  resizeAsset: function (instance, attr, settings) {
    const s3 = new aws.S3()
    const getObject = Promise.promisify(s3.getObject, s3)
    const url = instance.get(attr)
    const key = url.replace(process.env.AWS_S3_CONTENT_URL + '/', '')
    const newKey = key.replace(/(\.\w{2,4})?$/, '-resized$1')
    const newUrl = process.env.AWS_S3_CONTENT_URL + '/' + newKey

    sails.log.info('from: ' + url)
    sails.log.info('to:   ' + newUrl)

    return getObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }).then(obj => {
      const resize = gm(obj.Body)
      .resize(settings.width, settings.height, '>') // do not resize if already smaller
      .stream()
      .pipe(s3stream.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        ACL: 'public-read',
        ContentType: mime.lookup(key),
        Key: newKey
      }))

      return promisifyStream(resize)
      .then(() => instance.save({[attr]: newUrl}, {patch: true}))
    })
  }

}
