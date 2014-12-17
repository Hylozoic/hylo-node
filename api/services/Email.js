var api = require('sendwithus')(process.env.SENDWITHUS_KEY);

var defaultOptions = {
  sender: {
    address: process.env.EMAIL_SENDER,
    name: 'Hylo'
  }
};

module.exports = {
  sendInvitation: function(email, data, cb) {
    api.send(_.extend(defaultOptions, {
      email_id: 'tem_ZXZuvouDYKKhCrdEWYbEp9',
      recipient: {address: email},
      email_data: data
    }), cb);
  },

  sendNewCommentNotification: function(email, data, cb) {
    api.send(_.extend(defaultOptions, {
      email_id: 'tem_tP6JzrYzvvDXhgTNmtkxuW',
      recipient: {address: email},
      email_data: data
    }), cb);
  }
};