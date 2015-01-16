var api = require('sendwithus')(process.env.SENDWITHUS_KEY),
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

  sendNewCommentNotification: function(email, data, cb) {
    return sendEmail(_.extend(defaultOptions, {
      email_id: 'tem_tP6JzrYzvvDXhgTNmtkxuW',
      recipient: {address: email},
      email_data: data
    }), cb);
  }
};