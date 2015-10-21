module.exports = bookshelf.Model.extend({
  tableName: 'devices',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  sendPushNotification: function (alert, path, options) {
    var device = this
    if (!this.get('enabled')) {
      return
    }
    sails.log.debug("about to go into the promise")
    User.find(this.get('user_id'), options)
    .then(function (user) {
      sails.log.debug("made it into the promise,", user)
      var badge_no = user.get('new_notification_count')
      return PushNotification.forge({
        device_token: device.get('token'),
        alert: alert,
        path: path,
        badge_no: badge_no,
        platform: device.get('platform'),
        time_queued: (new Date()).toISOString()
      })
      .save({}, options)
      .then(pushNotification => pushNotification.send(options))
    })
  }
})
