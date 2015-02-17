var crypto = require('crypto');

var encryptionType = 'aes-128-ecb',
  key = function() {
    return new Buffer(process.env.PLAY_APP_SECRET.substring(0, 16), 'utf-8');
  };

module.exports = {

  encrypt: function(text) {
    var cipher = crypto.createCipheriv(encryptionType, key(), '');

    cipher.end(text);
    return cipher.read().toString('hex');
  },

  decrypt: function(code) {
    var decipher = crypto.createDecipheriv(encryptionType, key(), '');
    decipher.end(new Buffer(code, 'hex'));
    return decipher.read().toString();
  }

};