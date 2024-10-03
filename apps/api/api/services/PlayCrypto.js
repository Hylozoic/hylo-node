import crypto from 'crypto'

const encryptionType = 'aes-128-ecb'

function key () {
  return Buffer.from(process.env.PLAY_APP_SECRET.substring(0, 16), 'utf-8')
}

module.exports = {
  encrypt: function (text) {
    var cipher = crypto.createCipheriv(encryptionType, key(), '')

    cipher.end(text)
    return cipher.read().toString('hex')
  },

  decrypt: function (code) {
    var decipher = crypto.createDecipheriv(encryptionType, key(), '')
    decipher.end(Buffer.from(code, 'hex'))
    return decipher.read().toString()
  }
}
