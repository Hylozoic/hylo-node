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

  sendNewCommentNotification: function(opts) {
    return sendEmail(_.merge(defaultOptions, {
      email_id: 'tem_tP6JzrYzvvDXhgTNmtkxuW',
      recipient: {address: opts.email},
      email_data: opts.data,
      version_name: opts.version,
      sender: opts.sender
    }));
  },

  seedReplyAddress: function(postId, userId) {
    // TODO
    return 'placeholder-todo@hylo.com';
  }
};