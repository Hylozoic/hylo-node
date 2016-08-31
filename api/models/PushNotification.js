import decode from 'ent/decode'
import rollbar from 'rollbar'
import truncate from 'trunc-html'

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',

  send: function (options) {
    var deviceToken = this.get('device_token')
    var platform = this.getPlatform()
    var alert = this.get('alert')
    var path = this.get('path')
    var badgeNo = this.get('badge_no')

    return this.save({'time_sent': (new Date()).toISOString()}, options)
    .then(pn => OneSignal.notify(platform, deviceToken, alert, path, badgeNo))
    .catch(e => {
      if (process.env.NODE_ENV !== 'production') throw e
      const err = e instanceof Error ? e : new Error(e)
      rollbar.handleErrorWithPayloadData(err, {custom: {
        server_token: process.env.ONESIGNAL_APP_ID,
        device_token: deviceToken
      }})
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
  textForComment: function (comment, version) {
    const person = comment.relations.user.get('name')
    const blurb = decode(truncate(comment.get('text'), 80).text)
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
  }

})
