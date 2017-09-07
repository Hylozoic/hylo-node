import Busboy from 'busboy'
import { upload } from '../services/Uploader'
module.exports = {
  create: function (req, res) {
    const args = {
      userId: req.session.userId,

      // if the request is application/x-www-form-urlencoded, these will have
      // values, thanks to express's body parser (see config/customMiddleware).
      // but if the request is multipart/form-data, then they will be blank,
      // and populated later by busboy's 'field' event handler.
      type: req.param('type'),
      id: req.param('id'),
      url: req.param('url')
    }

    let busboy

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
      return Promise.resolve(res.status(422).send({error: err.message}))
    }

    busboy.on('field', (name, value) => {
      if (['id', 'type', 'url'].includes(name)) {
        args[name] = value
      }
    })

    // this promise is used for tests
    return new Promise((resolve, reject) => {
      let gotFile

      const doUpload = () =>
        upload(args)
        .then(url => resolve(res.ok({url})))
        .catch(err => {
          if (err.message.startsWith('Validation error')) {
            return resolve(res.status(422).send({error: err.message}))
          }

          if (err.message.includes('unsupported image format')) {
            return resolve(res.status(422).send({error: 'Unsupported image format'}))
          }

          resolve(res.serverError(err))
        })

      busboy.on('file', (name, stream, filename) => {
        // we assume that all 'field' events have already been handled by now
        Object.assign(args, {stream, filename})
        gotFile = true
        doUpload()
      })

      busboy.on('error', err => resolve(res.serverError(err)))
      busboy.on('finish', () => gotFile || doUpload())
      req.pipe(busboy)
    })
  }
}
