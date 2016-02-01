module.exports = bookshelf.Model.extend({
  tableName: 'devices',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  sendPushNotification: function (alert, path) {
    var device = this
    if (!this.get('enabled')) {
      return
    }
    if (!this.get('version')) {
      // this will be replaced to a call to an alternative push api for old versions of the app
      return
    }
    User.find(this.get('user_id'))
    .then(function (user) {
      var badge_no = user.get('new_notification_count')
      return PushNotification.forge({
        device_token: device.get('token'),
        alert: alert,
        path: path,
        badge_no: badge_no,
        platform: device.get('platform'),
        time_queued: (new Date()).toISOString()
      })
      .save({})
      .then(pushNotification => pushNotification.send())
    })
  },

  resetNotificationCount: function () {
    var device = this
    if (!this.get('enabled') || this.get('platform') !== 'ios_macos') {
      return
    }
    return PushNotification.forge({
      device_token: device.get('token'),
      alert: '',
      path: '',
      badge_no: 0,
      platform: device.get('platform'),
      time_queued: (new Date()).toISOString()
    })
    .save({})
    .then(pushNotification => pushNotification.send())
  }
})
