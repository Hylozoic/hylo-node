import decode from 'ent/decode'
import truncate from 'trunc-html'

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',
  requireFetch: false,

  device: function () {
    return this.belongsTo(Device)
  },

  send: async function (options) {
    const platform = this.getPlatform()
    const alert = this.get('alert')
    const path = this.get('path')
    const badgeNo = this.get('badge_no')

    await this.load('device')
    const { device } = this.relations
    const deviceToken = device.get('token')
    const playerId = device.get('player_id')
    const disabled = !process.env.PUSH_NOTIFICATIONS_ENABLED && (
      !process.env.PUSH_NOTIFICATIONS_TESTING_ENABLED || !device.get('tester')
    )

    await this.save({sent_at: new Date().toISOString(), disabled}, options)
    if (!disabled) {
      await OneSignal.notify({
        platform, deviceToken, playerId, alert, path, badgeNo
      })
    }
    return this
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

  textForPost: function (post, group, userId, version) {
    const person = post.relations.user.get('name')
    const postName = decode(post.get('name'))

    return version === 'mention'
      ? `${person} mentioned you in "${postName}"`
      : `${person} posted "${postName}" in ${group.get('name')}`
  },

  textForAnnouncement: function (post) {
    const person = post.relations.user.get('name')
    const postName = decode(post.get('name'))

    return `${person} sent an announcement titled "${postName}"`
  },

  textForEventInvitation: function (post, actor) {
    const postName = decode(post.get('name'))

    return `${actor.get('name')} invited you to "${postName}"`
  },

  textForJoinRequest: function (group, actor) {
    return `${actor.get('name')} asked to join ${group.get('name')}`
  },

  textForApprovedJoinRequest: function (group, actor) {
    return `${actor.get('name')} approved your request to join ${group.get('name')}`
  },

  textForGroupChildGroupInvite: function (parentGroup, childGroup, actor) {
    return `${actor.get('name')} invited your group ${childGroup.name} to join their group ${parentGroup.name}`
  },

  textForGroupChildGroupInviteAccepted: function (parentGroup, childGroup, actor) {
    return `${actor.get('name')} accepted your invite of their group ${childGroup.name} to join your group ${parentGroup.name}`
  },

  textForGroupParentGroupJoinRequest: function (parentGroup, childGroup, actor) {
    return `${actor.get('name')} is requesting to add their group ${childGroup.name} as a member of your group ${parentGroup.name}`
  },

  textForGroupParentGroupJoinRequestAccepted: function (parentGroup, childGroup, actor) {
    return `${actor.get('name')} accepted your request to add your group ${childGroup.name} as a member of their group ${parentGroup.name}`
  },

  textForDonationTo: function (contribution) {
    const project = contribution.relations.project
    const postName = decode(project.get('name'))
    const amount = contribution.get('amount') / 100

    return `You contributed $${amount} to "${postName}"`
  },

  textForDonationFrom: function (contribution) {
    const actor = contribution.relations.user
    const project = contribution.relations.project
    const postName = decode(project.get('name'))

    const amount = contribution.get('amount') / 100
    return `${actor.get('name')} contributed $${amount} to "${postName}"`
  }
})
