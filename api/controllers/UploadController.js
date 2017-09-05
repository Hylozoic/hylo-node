import Busboy from 'busboy'
import { upload } from '../services/Uploader'

module.exports = {
  create: function (req, res) {
    const { type, id, url } = req.allParams()

    // this promise is used for tests
    return new Promise(resolve => {
      function doUpload (args) {
        upload(Object.assign({}, args, {type, id, userId: req.session.userId}))
        .then(() => {
          resolve(res.ok('uploaded!'))
        })
        .catch(err => {
          if (err.message.startsWith('Validation error')) {
            return resolve(res.status(422).send(err.message))
          }

          resolve(res.serverError(err))
        })
      }

      if (url) return doUpload({url})

      const busboy = new Busboy({headers: req.headers})
      var gotFile = false
      busboy.on('file', function (fieldname, stream, filename, encoding, mimetype) {
        console.log(`${fieldname}, ${filename}, ${encoding}, ${mimetype}`)
        gotFile = true
        doUpload({stream, filename})
      })

      busboy.on('finish', () => {
        if (!gotFile) {
          resolve(res.status(422).send("The request didn't contain any file data"))
        }
      })

      req.pipe(busboy)
    })
  }
}
