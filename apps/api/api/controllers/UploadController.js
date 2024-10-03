import Busboy from 'busboy'
import { upload } from '../../lib/uploader'
import { getMediaTypeFromMimetype } from '../models/media/util'

module.exports = {
  create: function (req, res) {
    const args = {
      userId: req.session.userId,

      // if the request is application/x-www-form-urlencoded or
      // application/json, these will have values, thanks to express's body
      // parser (see config/customMiddleware). but if the request is
      // multipart/form-data, then they will be blank, and populated later by
      // busboy's 'field' event handler.
      type: req.param('type'),
      id: req.param('id'),
      url: req.param('url'),
      filename: req.param('filename')
    }

    // this promise is used for tests
    return new Promise(resolve => {
      if (req.headers['content-type'] === 'application/json') {
        doUpload(res, args, resolve)
      } else {
        setupBusboy(req, res, args, resolve)
      }
    })
  }
}

const doUpload = (res, args, resolve) =>
  upload(args)
  .then(({ type, id, url, mimetype }) => {
    const uploadResponse = {
      type,
      id,
      url,
      // Roughly, the frontend and graphql implemenations use
      // 'attachment' and 'attachmentType' for what we call
      // Media and Media.type here on in the backend.
      attachmentType: getMediaTypeFromMimetype(mimetype)
    }

    return resolve(res.ok(uploadResponse))
  })
  .catch(err => {
    if (err.message.startsWith('Validation error')) {
      return resolve(res.status(422).send({error: err.message}))
    }

    if (err.message.includes('unsupported image format')) {
      return resolve(res.status(422).send({error: 'Unsupported image format'}))
    }

    resolve(res.serverError(err))
  })

function setupBusboy (req, res, args, resolve) {
  let busboy, gotFile

  try {
    // this can throw errors due to invalid Content-Type
    busboy = new Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: 10 * 1048576
      }
    })
  } catch (err) {
    return resolve(res.status(422).send({error: err.message}))
  }

  busboy.on('field', (name, value) => {
    if (['id', 'type', 'url'].includes(name)) {
      args[name] = value
    }
  })

  busboy.on('file', (name, stream, filename) => {
    // we assume that all 'field' events have already been handled by now
    Object.assign(args, {stream, filename})
    gotFile = true
    doUpload(res, args, resolve)
  })

  busboy.on('error', err => resolve(res.serverError(err)))
  busboy.on('finish', () => gotFile || doUpload(res, args, resolve))

  req.pipe(busboy)
}
