var api = require('sendwithus')(process.env.SENDWITHUS_KEY);

module.exports = {
  sendInvitation: function(email, data, cb) {
    api.send({
      email_id: 'tem_ZXZuvouDYKKhCrdEWYbEp9',
      recipient: {address: email},
      email_data: data,
      sender: {
        address: process.env.EMAIL_SENDER,
        name: 'Hylo'
      },
    }, cb);
  }
};