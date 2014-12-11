var api = require('sendwithus')(process.env.SENDWITHUS_KEY);

module.exports = {
  sendInvitation: function(opts, email_data, cb) {
    api.send({
      email_id: 'tem_ZXZuvouDYKKhCrdEWYbEp9',
      recipient: {address: opts.to},
      email_data: email_data,
      version_name: opts.version_name,
      sender: {
        address: process.env.EMAIL_SENDER,
        name: opts.sender_name || 'Hylo'
      },
    }, cb);
  }
};