module.exports = bookshelf.Model.extend({
  tableName: 'devices',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  sendPushNotification: function (alert, path) {
    if (process.env.DISABLE_PUSH_NOTIFICATIONS) return

    if (!this.get('enabled')) return

    // this will be replaced to a call to an alternative push api for old versions of the app
    if (!this.get('version')) return

    return User.find(this.get('user_id'))
    .then(user => User.unseenThreadCount(user.id)
      .then(count => new PushNotification({
        alert,
        path,
        badge_no: user.get('new_notification_count') + count,
        device_token: this.get('token'),
        platform: this.get('platform'),
        queued_at: new Date().toISOString()
      }).save().then(push => push.send())))
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
      queued_at: (new Date()).toISOString()
    })
    .save({})
    .then(pushNotification => pushNotification.send())
  }
})
