import os from 'os'
import fs from 'fs'
import path from 'path'
import aws from 'aws-sdk'
import { parse } from 'url'
import { PassThrough } from 'stream'
import mime from 'mime'

export function createTestFileStorageStream (filename, type, id) {
  const testPath = path.join(os.tmpdir(), filename)
  const stream = fs.createWriteStream(testPath)
  stream.url = testPath
  return stream
}

export function createS3StorageStream (uploadType, id, { userId, fileType, filename }) {
  ;[
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'UPLOADER_PATH_PREFIX'
  ].forEach(key => {
    if (!process.env[key]) {
      throw new Error(`missing process.env.${key}`)
    }
  })

  const s3 = new aws.S3()
  const wrapper = createWrapperStream()

  const upload = s3.upload({
    // even though we're already using a PassThrough stream, the upload doesn't
    // work unless we use another PassThrough. ¯\_(ツ)_/¯
    Body: wrapper.pipe(new PassThrough()),

    ACL: 'public-read',
    Bucket: process.env.AWS_S3_BUCKET,
    ContentType: getMimeType(fileType, filename),
    Key: makePath(uploadType, id, { userId, fileType, filename })
  }, (err, data) => {
    if (err) return wrapper.emit('error', err)
    wrapper.url = getFinalUrl(data.Location)
    wrapper.triggerFinish()
  })

  wrapper.upload = upload
  return wrapper
}

// this is a modified PassThrough:
// - the 'finish' event does not fire until `triggerFinish` is called
// - it passes the 'progress' event listener to the S3 upload manager
function createWrapperStream () {
  const stream = new PassThrough()
  let onFinishCallbacks = []

  stream._realOn = stream.on
  stream.on = function (eventName, callback) {
    if (eventName === 'finish') {
      return onFinishCallbacks.push(callback)
    }

    if (eventName === 'progress') {
      return stream.upload.on('httpUploadProgress', callback)
    }

    return stream._realOn(eventName, callback)
  }

  stream.triggerFinish = () => onFinishCallbacks.forEach(fn => fn())

  return stream
}

function getFinalUrl (url) {
  if (!process.env.UPLOADER_HOST) return url
  const u = parse(url)
  u.host = process.env.UPLOADER_HOST
  return u.format()
}

export function makePath (type, id, { userId, fileType, filename }) {
  const rand = Math.random().toString().substring(2, 6)
  let basename = filename || `${Date.now()}_${rand}`
  if (fileType) {
    basename = basename.replace(/(\.\w{2,4})?$/, '.' + fileType.ext)
  }

  return path.join(
    process.env.UPLOADER_PATH_PREFIX,
    'user',
    userId ? String(userId) : 'system',
    `${type}_${id || 'new'}_${basename}`
  )
}

function getMimeType (fileType, filename) {
  return fileType
    ? fileType.mime
    : filename
      ? mime.lookup(filename)
      : 'application/octet-stream'
}
