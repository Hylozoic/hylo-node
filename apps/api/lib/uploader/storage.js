import path from 'path'
import aws from 'aws-sdk'
import { parse } from 'url'
import { PassThrough } from 'stream'
import mime from 'mime'
import sanitize from 'sanitize-filename'

export function safeBasename (url = '') {
  url = url.replace(/\?.*$/, '')
  const name = sanitize(path.basename(url))
  if (!name) {
    const rand = Math.random().toString().substring(2, 6)
    return `${Date.now()}_${rand}`
  }
  return name
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
    ContentType: getMimetypeFromFileType(fileType, filename),
    Key: makePath(uploadType, id, { userId, fileType, filename })
  }, (err, data) => {
    if (err) return wrapper.emit('error', err)
    wrapper.url = getFinalUrl(data.Location)
    wrapper.triggerFinish()
  })

  wrapper.upload = upload
  return wrapper
}

export function deleteS3Objects (urls) {
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

  const filteredUrls = urls
    .filter((url) => url && url.includes('/evo-uploads/')) // remove nulls and urls for external media
    .map((url) => {
      return { Key: parse(url).path.slice(1) } // slice off the '/' at the start of the path, for a valid key
    })

  const s3 = new aws.S3()
  s3.deleteObjects({
    Bucket: process.env.AWS_S3_BUCKET,
    Delete: {
      Objects: filteredUrls
    }
  }, function (err, data) {
    if (err) console.log(err, err.stack) // an error occurred
    else {
      console.log(data, 'Success')
    }
  })
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
  let basename = safeBasename(filename)
  if (fileType) {
    basename = basename.replace(/(\.\w{2,4})?$/, '.' + fileType.ext)
  }

  return path.join(
    process.env.UPLOADER_PATH_PREFIX,
    'user',
    userId ? String(userId) : 'system',
    type,
    id ? String(id) : 'new',
    basename
  )
}

function getMimetypeFromFileType (fileType, filename) {
  return fileType
    ? fileType.mime
    : filename
      ? mime.lookup(filename)
      : 'application/octet-stream'
}
