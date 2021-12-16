import crypto from 'crypto'

module.exports = bookshelf.Model.extend({
  tableName: 'user_verification_codes',
  requireFetch: false,
  hasTimestamps: ['created_at', null],
}, {

  create: async function (email, options) {
    const randomBytes = Promise.promisify(crypto.randomBytes)
    const bytes = await randomBytes(3)
    const code = parseInt(bytes.toString('hex'), 16).toString().substr(0,6)

    return new UserVerificationCode({
      email,
      code,
      created_at: new Date()
    }).save(null, _.pick(options, 'transacting'))
  },

  verify: function (email, code) {
    return bookshelf.transaction(async (transacting) => {
      const row = await UserVerificationCode.where({ email, code }).fetch({ transacting })
      let valid = false
      if (row) {
        // Codes expire in 4 hours
        if ((new Date()) - row.get('created_at') < 4 * 60 * 60000) {
          valid = true
        }
        await row.destroy({ transacting })
      }
      return valid
    })
  }

})
