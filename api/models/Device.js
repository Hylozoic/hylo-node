module.exports = bookshelf.Model.extend({
  tableName: 'devices',
  requireFetch: false,
  hasTimestamps: true,

  pushNotifications: function () {
    return this.hasMany(PushNotification)
  },

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  sendPushNotification: async function (alert, path) {
    if (!this.get('enabled')) return

    // this will be replaced to a call to an alternative push api for old
    // versions of the app
    if (!this.get('version')) return

    const user = await User.find(this.get('user_id'))
    const count = await User.unseenThreadCount(user.id)
    const push = await PushNotification.forge({
      alert: alert.substring(0, 255),
      path,
      badge_no: user.get('new_notification_count') + count,
      device_id: this.id,
      platform: this.get('platform'),
      queued_at: new Date().toISOString()
    }).save()
    return push.send()
  },

  resetNotificationCount: function () {
    if (!this.get('enabled')) return
    return PushNotification.forge({
      device_id: this.id,
      alert: '',
      path: '',
      badge_no: 0,
      platform: this.get('platform'),
      queued_at: (new Date()).toISOString()
    })
    .save({})
    .then(pushNotification => pushNotification.send())
  }
}, {
  upsert: function ({ userId, playerId, platform, version }) {
    return Device.where({player_id: playerId}).fetch()
    .then(device => device
      ? device.save({
        user_id: userId,
        platform,
        version,
        updated_at: new Date()
      })
      : Device.forge({
        user_id: userId,
        player_id: playerId,
        platform,
        version,
        created_at: new Date()
      }).save())
  }
})
