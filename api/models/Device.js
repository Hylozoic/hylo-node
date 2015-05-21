var format = require('util').format;
var apn = require('apn');

module.exports = bookshelf.Model.extend({
  tableName: 'devices',
    
  user: function () {
    return this.belongsTo(User, "user_id");
  },

  sendPushNotification: function(alert, url) {
    var badge_no = this.get('badge_no') + 1;
    this.set("badge_no", badge_no);
    this.save();
    
    var payload = JSON.stringify({url: url})
    
    return Qdpush.forge({
      device_token: this.get('token'),
      alert: alert,
      payload: payload,
      badge_no: badge_no,
      time_queued: (new Date()).toISOString()
    })
      .save();
  },
  
  sendPushNotificationOld: function(notification) {

    var options = {passphrase: "kniujhYY&u",
                   key: "/Users/robbiecarlton/programming/node/apntest/key.pem",
                   cert: "/Users/robbiecarlton/programming/node/apntest/cert.pem"
                  };
    
    var apnConnection = new apn.Connection(options)

    var myDevice = new apn.Device(this.get('token'));

    var note = new apn.Notification()

    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = 11;
    note.alert = "This worked";
    note.payload = {'url': '/post/67'};

    return apnConnection.pushNotification(note, myDevice);
    
  }

});
