import os from 'os'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import aws from 'aws-sdk'
import { PassThrough } from 'stream'

export function createTestFileStorageStream (filename, type, id) {
  const testPath = path.join(os.tmpdir(), filename)
  const stream = fs.createWriteStream(testPath)
  stream.url = testPath
  return stream
}

export function createS3StorageStream (filename, type, id) {
  // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be in process.env
  const s3 = new aws.S3()
  const wrapper = createWrapperStream()

  const upload = s3.upload({
    // even though we're already using a PassThrough stream, the upload doesn't
    // work unless we use another PassThrough. ¯\_(ツ)_/¯
    Body: wrapper.pipe(new PassThrough()),

    ACL: 'public-read',
    Bucket: process.env.AWS_S3_BUCKET,
    ContentType: mime.lookup(filename),
    Key: path.join(process.env.UPLOADER_PATH_PREFIX, type, String(id), filename)
  }, (err, data) => {
    if (err) return wrapper.emit('error', err)
    wrapper.url = data.Location
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
