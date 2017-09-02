import request from 'request'
import path from 'path'
import os from 'os'
import fs from 'fs'
import fileType from 'file-type'
import { PassThrough } from 'stream'
import sharp from 'sharp'

export function upload (args) {
  let { type, id, userId, url, stream, filename } = args

  return validate(args)
  .then(() => {
    // if url is present, construct a request stream
    if (url) {
      stream = request(url)
      filename = path.basename(url)
    }

    let testPath, passthrough, resizer, fileStream, finalFilename
    let streamHasError = false

    return new Promise((resolve, reject) => {
      function setupStreams (data) {
        // determine the file type from the first chunk of data
        const type = fileType(data)
        if (!type) {
          stream.emit('error', new Error("couldn't determine file type"))
          return
        }

        finalFilename = Date.now() + filename      // add timestamp
        .replace(/\?.*$/, '')                      // remove query parameters
        .replace(/(\.\w{2,4})?$/, '.' + type.ext)  // add file extension

        testPath = path.join(os.tmpDir(), Date.now() + '_' + finalFilename)

        // this is used so we can get the file type from the first chunk of
        // data and still use `.pipe` -- you can't pipe a stream after getting
        // data from it
        passthrough = new PassThrough()
        fileStream = fs.createWriteStream(testPath)
        resizer = sharp().resize(300, 300)
        passthrough.pipe(resizer).pipe(fileStream)

        passthrough.on('end', () => {
          console.log('passthrough end')
        })

        resizer.on('end', () => {
          console.log('resizer end')
          fileStream.end()

          // putting this here because fileStream doesn't seem to ever send an
          // end event ¯\_(ツ)_/¯
          resolve('stream done! saved to ' + testPath)
        })

        fileStream.on('end', () => {
          console.log('filestream end')
        })
      }

      stream.on('data', data => {
        if (!finalFilename && !streamHasError) setupStreams(data)
        passthrough.write(data)
      })

      stream.on('error', err => {
        streamHasError = true
        console.log('stream error')
        stream.destroy(err)
        if (passthrough) passthrough.destroy(err)
        if (resizer) resizer.destroy(err)
        if (fileStream) fileStream.destroy(err)
        reject(err)
      })

      stream.on('end', () => {
        if (passthrough) passthrough.end()
      })
    })

    // then convert/resize
    // then upload to S3
  })
}

function validate ({ type, url, stream }) {
  // file data or url must be present
  // type & id must be present
  // type must be valid
  if (!uploadTypes.includes(type)) {
    return Promise.reject(new Error('Validation error: Invalid type'))
  }

  if (!url && !stream) {
    return Promise.reject(new Error('Validation error: No url and no stream'))
  }

  // current user must have permission to change type and id

  return Promise.resolve()
}

const uploadTypes = [
  'user-avatar',
  'user-banner',
  'community-avatar',
  'community-banner',
  'network-avatar',
  'network-banner',
  'post',
  'comment'
]

export const userAvatarUploadSettings = person => ({
  id: person.id,
  subject: 'user-avatar',
  path: `user/${person.id}/avatar`,
  convert: {width: 200, height: 200, fit: 'crop', rotate: 'exif'}
})

// use UploadController for the first six but use the existing post & comment
// creation endpoints for the last two? that would require supporting multipart
// uploads in GraphQL
// https://medium.com/@danielbuechele/file-uploads-with-graphql-and-apollo-5502bbf3941e
//
// and then in that case, why not do the whole thing in graphql?

if (require.main === module) {
  upload({
    type: 'user-avatar',
    url: process.argv[2]
  })
  .then(x => console.log('yep!', x))
  .catch(err => console.log('nope!', err))
}
