import decode from 'ent/decode'
import rollbar from 'rollbar'
import truncate from 'trunc-html'

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',

  device: function () {
    return this.belongsTo(Device)
  },

  send: function (options) {
    const platform = this.getPlatform()
    const alert = this.get('alert')
    const path = this.get('path')
    const badgeNo = this.get('badge_no')

    return this.load('device')
    .then(() => {
      const { device } = this.relations
      const deviceToken = device.get('device_token')
      const playerId = device.get('player_id')
      const disabled = !process.env.PUSH_NOTIFICATIONS_ENABLED && (
        !process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED || !device.get('tester')
      )

      return this.save({sent_at: new Date().toISOString(), disabled}, options)
      .then(pn => disabled || OneSignal.notify({
        platform, deviceToken, playerId, alert, path, badgeNo
      }))
      .catch(e => {
        const err = e instanceof Error ? e : new Error(e)
        if (process.env.NODE_ENV !== 'production') throw err
        rollbar.handleErrorWithPayloadData(err, {custom: {
          server_token: process.env.ONESIGNAL_APP_ID,
          device_id: this.relations.device.id
        }})
      })
    })
  },

  getPlatform: function () {
    var platform = this.get('platform')
    if (platform) {
      return platform
    } else {
      return 'ios_macos'
    }
  }

}, {
  textForContribution: function (contribution) {
    const post = contribution.relations.post
    return `You have been added as a contributor to the request "${post.get('name')}"`
  },

  textForComment: function (comment, version) {
    const person = comment.relations.user.get('name')
    const { media } = comment.relations
    if (media && media.length !== 0) {
      return `${person} sent an image`
    }
    const blurb = decode(truncate(comment.get('text'), 140).text).trim()
    const postName = comment.relations.post.get('name')

    return version === 'mention'
      ? `${person} mentioned you: "${blurb}" (in "${postName}")`
      : `${person}: "${blurb}" (in "${postName}")`
  },

  textForPost: function (post, community, userId, version) {
    const person = post.relations.user.get('name')
    const postName = decode(post.get('name'))

    return version === 'mention'
      ? `${person} mentioned you in "${postName}"`
      : `${person} posted "${postName}" in ${community.get('name')}`
  },

  textForJoinRequest: function (community, actor) {
    return `${actor.get('name')} asked to join ${community.get('name')}`
  },

  textForApprovedJoinRequest: function (community, actor) {
    return `${actor.get('name')} approved your request to join ${community.get('name')}`
  }
})
