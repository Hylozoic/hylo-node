import request from 'request'
import fileType from 'file-type'
import { PassThrough } from 'stream'
import { createReadStream } from 'fs'
import { createConverterStream } from './Uploader/converter'
import { createS3StorageStream } from './Uploader/storage'
import { validate } from './Uploader/validation'
import path from 'path'

export function upload (args) {
  let { type, id, url, stream, filename, onProgress } = args

  return validate(args)
  .then(() => {
    let source, passthrough, converter, storage, finalFilename
    let sourceHasError = false

    if (url) {
      source = request(url)
      filename = path.basename(url)
    } else {
      source = stream
    }

    function setupStreams (data, resolve, reject) {
      finalFilename = cleanupFilename(data, filename)
      if (!finalFilename) {
        return source.emit('error', new Error("couldn't determine file type"))
      }

      // this is used so we can get the file type from the first chunk of
      // data and still use `.pipe` -- you can't pipe a stream after getting
      // data from it
      passthrough = new PassThrough()

      converter = createConverterStream(type, id)
      converter.on('error', err => reject(err))

      storage = createS3StorageStream(finalFilename, type, id)
      storage.on('finish', () => resolve(storage.url))
      storage.on('error', err => reject(err))
      if (onProgress) storage.on('progress', onProgress)

      passthrough.pipe(converter).pipe(storage)
    }

    return new Promise((resolve, reject) => {
      source.on('data', data => {
        if (sourceHasError) return
        if (!finalFilename) setupStreams(data, resolve, reject)
        if (passthrough) passthrough.write(data)
      })

      source.on('error', err => {
        sourceHasError = true
        source.destroy(err)
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

function cleanupFilename (firstDataChunk, initialFilename) {
  const type = fileType(firstDataChunk)
  if (!type) return null

  // add timestamp, remove query parameters, add file extension
  const finalFilename = Date.now() + '_' + initialFilename
  .replace(/[\t\r\n]/g, '')
  .replace(/\?.*$/, '')
  .replace(/(\.\w{2,4})?$/, '.' + type.ext)

  return finalFilename
}

if (require.main === module) {
  const dotenv = require('dotenv')
  dotenv.load()

  const arg = process.argv[2]

  upload({
    type: 'userBanner',
    userId: 42,
    id: 42,
    url: arg.startsWith('http') ? arg : null,
    stream: arg.startsWith('http') ? null : createReadStream(arg),
    filename: path.basename(arg),
    onProgress: progress => console.log('progress:', progress)
  })
  .then(x => console.log('OK!', x))
  .catch(err => {
    console.log('ERROR!', err.message)
  })
}

// use UploadController for the first six but use the existing post & comment
// creation endpoints for the last two? that would require supporting multipart
// uploads in GraphQL
// https://medium.com/@danielbuechele/file-uploads-with-graphql-and-apollo-5502bbf3941e
//
// and then in that case, why not do the whole thing in graphql?
