import request from 'request'
import fileType from 'file-type'
import { PassThrough } from 'stream'
import { createConverterStream } from './Uploader/converter'
import { createStorageStream } from './Uploader/storage'
import { validate } from './Uploader/validation'
import path from 'path'

export function upload (args) {
  let { type, id, url, stream, filename } = args

  return validate(args)
  .then(() => {
    let source, finalUrl, passthrough, converter, storage, finalFilename
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

      ;[storage, finalUrl] = createStorageStream(finalFilename, type, id)
      converter = createConverterStream(type, id)

      passthrough.pipe(converter).pipe(storage)

      converter.on('end', () => {
        console.log('converter end')
        storage.end()

        // putting this here because storage doesn't seem to ever send an
        // end event ¯\_(ツ)_/¯
        resolve('stream done! saved to ' + finalUrl)
      })

      storage.on('end', () => {
        console.log('filestream end')
      })
    }

    return new Promise((resolve, reject) => {
      source.on('data', data => {
        if (!finalFilename && !sourceHasError) {
          setupStreams(data, resolve, reject)
        }
        passthrough.write(data)
      })

      source.on('error', err => {
        sourceHasError = true
        console.log('source stream error')
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

    // then convert/resize
    // then upload to S3
  })
}


function cleanupFilename (firstDataChunk, initialFilename) {
  const type = fileType(firstDataChunk)
  if (!type) return null

  const finalFilename = Date.now() + initialFilename // add timestamp
  .replace(/\?.*$/, '')                              // remove query parameters
  .replace(/(\.\w{2,4})?$/, '.' + type.ext)          // add file extension

  return finalFilename
}

if (require.main === module) {
  upload({
    type: 'userAvatar',
    userId: 1,
    id: 1,
    url: process.argv[2]
  })
  .then(x => console.log('yep!', x))
  .catch(err => console.log('nope!', err))
}

// use UploadController for the first six but use the existing post & comment
// creation endpoints for the last two? that would require supporting multipart
// uploads in GraphQL
// https://medium.com/@danielbuechele/file-uploads-with-graphql-and-apollo-5502bbf3941e
//
// and then in that case, why not do the whole thing in graphql?
