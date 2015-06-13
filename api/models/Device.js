var format = require('util').format;
var apn = require('apn');

module.exports = bookshelf.Model.extend({
  tableName: 'devices',
    
  user: function () {
    return this.belongsTo(User, "user_id");
  },

  sendPushNotification: function(alert, path, options) {

    var badge_no = this.get('badge_no') + 1;
    this.set("badge_no", badge_no);
    return this.save({}, options)
      .then(function (device) {

        var payload = JSON.stringify({path: path});
        
        return PushNotification.forge({
          device_token: device.get('token'),
          alert: alert,
          payload: payload,
          badge_no: badge_no,
          time_queued: (new Date()).toISOString()
        })
        .save({}, options)
        .then(pushNotification => pushNotification.send(options));
      });
  }  
});
