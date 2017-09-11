import request from 'request'
import getFileType from 'file-type'
import { PassThrough } from 'stream'
import { createConverterStream } from './converter'
import { createS3StorageStream } from './storage'
import { validate } from './validation'

export function upload (args) {
  let { type, id, userId, url, stream, onProgress } = args

  return validate(args)
  .then(() => {
    let passthrough, converter, storage, didSetup, sourceHasError
    const source = url ? request(url) : stream

    function setupStreams (data, resolve, reject) {
      let fileType
      try {
        fileType = getFileType(data)
      } catch (err) {}

      didSetup = true

      // this is used so we can get the file type from the first chunk of
      // data and still use `.pipe` -- you can't pipe a stream after getting
      // data from it
      passthrough = new PassThrough()

      converter = createConverterStream(type, id, {fileType})
      converter.on('error', err => reject(err))

      storage = createS3StorageStream(type, id, {userId, fileType})
      storage.on('finish', () => resolve(storage.url))
      storage.on('error', err => reject(err))
      if (onProgress) storage.on('progress', onProgress)

      passthrough.pipe(converter).pipe(storage)
    }

    return new Promise((resolve, reject) => {
      source.on('data', data => {
        if (sourceHasError) return
        if (!didSetup) {
          try {
            setupStreams(data, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }
        if (passthrough) passthrough.write(data)
      })

      source.on('error', err => {
        sourceHasError = true
        if (passthrough) passthrough.destroy(err)
        if (converter) converter.destroy(err)
        if (storage) storage.destroy(err)
        reject(err)
      })

      source.on('end', () => {
        if (passthrough) passthrough.end()
      })
    })
  })
}
