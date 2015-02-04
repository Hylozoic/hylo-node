var api = require('sendwithus')(process.env.SENDWITHUS_KEY),
  format = require('util').format,
  Promise = require('bluebird'),
  sendEmail = Promise.promisify(api.send, api);

var defaultOptions = {
  sender: {
    address: process.env.EMAIL_SENDER,
    name: 'Hylo'
  }
};

module.exports = {
  sendInvitation: function(email, data) {
    return sendEmail(_.extend(defaultOptions, {
      email_id: 'tem_ZXZuvouDYKKhCrdEWYbEp9',
      recipient: {address: email},
      email_data: data
    }));
  },

  sendNewCommentNotification: function(opts) {
    return sendEmail(_.merge(defaultOptions, {
      email_id: 'tem_tP6JzrYzvvDXhgTNmtkxuW',
      recipient: {address: opts.email},
      email_data: opts.data,
      version_name: opts.version,
      sender: opts.sender
    }));
  },

  seedReplyAddress: function(seedId, userId) {
    var plaintext = format('%s%s|%s', process.env.MAILGUN_EMAIL_SALT, seedId, userId);
    return format('reply-%s@%s', PlayCrypto.encrypt(plaintext), process.env.MAILGUN_DOMAIN);
  }
};