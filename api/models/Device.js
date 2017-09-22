module.exports = bookshelf.Model.extend({
  tableName: 'devices',

  pushNotifications: function () {
    return this.hasMany(PushNotification)
  },

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  sendPushNotification: function (alert, path) {
    if (!this.get('enabled')) return

    // this will be replaced to a call to an alternative push api for old versions of the app
    if (!this.get('version')) return

    return User.find(this.get('user_id'))
    .then(user => User.unseenThreadCount(user.id)
      .then(count => new PushNotification({
        alert,
        path,
        badge_no: user.get('new_notification_count') + count,
        device_id: this.id,
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
      device_id: this.id,
      alert: '',
      path: '',
      badge_no: 0,
      platform: device.get('platform'),
      queued_at: (new Date()).toISOString()
    })
    .save({})
    .then(pushNotification => pushNotification.send())
  }
}, {
  upsert: function (userId, playerId, version) {
    return Device.where({player_id: playerId}).fetch()
    .then(device => device
      ? device.save({
        version,
        user_id: userId,
        updated_at: new Date()
      })
      : Device.forge({
        version,
        user_id: userId,
        player_id: playerId,
        created_at: new Date()
      }).save())
  }
})
