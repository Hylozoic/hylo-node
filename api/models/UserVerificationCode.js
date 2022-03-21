import crypto from 'crypto'
import { pick } from 'lodash'
import { decodeHyloJWT, generateHyloJWT } from '../../lib/HyloJWT'

module.exports = bookshelf.Model.extend({
  tableName: 'user_verification_codes',
  requireFetch: false,
  hasTimestamps: ['created_at', null],
}, {

  create: async function (email, options) {
    const randomBytes = Promise.promisify(crypto.randomBytes)
    const bytes = await randomBytes(3)
    const code = parseInt(bytes.toString('hex'), 16).toString().substr(0,6)
    const token = generateHyloJWT(email, { code })

    await new UserVerificationCode({ email, code, created_at: new Date() })
      .save(null, pick(options, 'transacting'))

    return { code, token }
  },

  verify: async function ({ email: providedEmail, token, code: providedCode }) {
    return bookshelf.transaction(async (transacting) => {
      // XXX: Don't need the code when verifying by JWT link but we still want to
      // expire the code when the JWT is used
      const decodedToken = token && decodeHyloJWT(token)
      const email = decodedToken?.sub || providedEmail
      const code = decodedToken?.code || providedCode
      const row = await UserVerificationCode.where({ email, code }).fetch({ transacting })
      let valid = false

      if (row) {
        // Codes expire in 4 hours
        if ((new Date()) - row.get('created_at') < 4 * 60 * 60000) {
          valid = true
        }
        // TODO: dont destroy until user is created? or if we have user table already being used then we can destroy
        await row.destroy({ transacting })
      }

      return valid
    })
  }
})
