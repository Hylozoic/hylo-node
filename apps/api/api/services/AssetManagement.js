import Promise from 'bluebird'
import request from 'request'
import sharp from 'sharp'
import { createS3StorageStream, safeBasename } from '../../lib/uploader/storage'

module.exports = {
  copyAsset: function (instance, type, attr) {
    const sourceUrl = instance.get(attr)
    const filename = safeBasename(sourceUrl)
    .replace(/((_\d+)?(\.\w{2,4}))?$/, `_${Date.now()}$3`)

    return runPipeline(sourceUrl, filename, type, instance.id)
    .then(url => instance.save({[attr]: url}, {patch: true}))
  },

  resizeAsset: function (instance, fromAttr, toAttr, settings = {}) {
    const { width, height, type, transacting } = settings
    const sourceUrl = instance.get(fromAttr)
    const filename = safeBasename(sourceUrl)
    .replace(/(\.\w{2,4})?$/, `_${width}x${height}$1`)

    return runPipeline(sourceUrl, filename, type, instance.id, stream =>
      stream.pipe(sharp().resize(width, height)))
    .then(url => instance.save({[toAttr]: url}, {patch: true, transacting}))
  }
}

function runPipeline (url, filename, type, id, pipeFn) {
  return new Promise((resolve, reject) => {
    sails.log.info('from: ' + url)

    let stream = request.get({url, encoding: null})
    if (pipeFn) stream = pipeFn(stream)
    stream = stream.pipe(createS3StorageStream(type, id, {filename}))

    stream.on('finish', () => {
      sails.log.info('to:   ' + stream.url)
      resolve(stream.url)
    })

    stream.on('error', reject)
  })
}
