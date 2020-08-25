import getFileType from 'file-type'
import mime from 'mime-types'
import request from 'request'
import { PassThrough } from 'stream'

import { createConverterStream } from './converter'
import { createPostImporter } from './postImporter'
import { createS3StorageStream } from './storage'
import { validate } from './validation'

export function upload (args) {
  let { type, id, userId, url, stream, onProgress, filename } = args

  return validate(args)
  .then(() => {
    let passthrough, converter, storage, didSetup, sourceHasError
    const source = url ? request(url) : stream
    if (!filename) filename = url

    function setupStreams (data, resolve, reject) {
      didSetup = true

      if (type === 'importPosts') {
        passthrough = createPostImporter(userId, id)
        passthrough.on('end', (e) => {
          // This returns to the front-end after the CSV has been read but before posts have been created
          const uploaderResult = {
            type,
            id,
            mimetype: "text/csv"
          }
          return resolve(uploaderResult)
        })
      } else {
        // this is used so we can get the file type from the first chunk of
        // data and still use `.pipe` -- you can't pipe a stream after getting
        // data from it
        passthrough = new PassThrough()

        const fileType = guessFileType(data, filename)
        const mimetype = fileType && fileType.mime

        converter = createConverterStream(type, id, {fileType})
        converter.on('error', err => reject(err))

        storage = createS3StorageStream(type, id, {userId, fileType, filename})
        storage.on('finish', () => {
          const uploaderResult = {
            type,
            id,
            url: storage.url,
            mimetype
          }

          return resolve(uploaderResult)
        })
        storage.on('error', err => reject(err))
        if (onProgress) storage.on('progress', onProgress)

        passthrough.pipe(converter).pipe(storage)
      }
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
        reject(err)
      })

      source.on('end', () => {
        if (passthrough) passthrough.end()
      })
    })
  })
}

export function guessFileType (data, filename) {
  let fileType
  try {
    fileType = getFileType(data)
    // Open Office documents exported from Google Docs are mis-identified by
    // getFileType so in the case of fileType returning a zip file type
    // (OO docs are zip files at the top level) we fallback to a mime-type
    // and extension identification based upon filename.
    if (fileType.ext === 'zip') {
      const mimetype = mime.lookup(filename)
      const extension = mime.extension(mimetype)
      fileType = {mime: mimetype, ext: extension}
    }
    return fileType
  } catch (err) {}
}
