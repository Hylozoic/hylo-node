var crypto = require('crypto');

module.exports = {

  encrypt: function(text) {
    var key = new Buffer(process.env.PLAY_APP_SECRET.substring(0, 16), 'utf-8'),
      cipher = crypto.createCipheriv('aes-128-ecb', key, '');

    cipher.end(text);
    return cipher.read().toString('hex');
  },

};