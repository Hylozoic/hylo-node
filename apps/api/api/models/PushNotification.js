import decode from 'ent/decode'
import { TextHelpers } from 'hylo-shared'
import { en } from '../../lib/i18n/en'
import { es } from '../../lib/i18n/es'
const locales = { en, es }

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
    const platform = this.get('platform')
    if (platform) {
      return platform
    } else {
      return 'ios_macos'
    }
  }

}, {
  textForContribution: function (contribution, locale) {
    const post = contribution.relations.post

    return locales[locale].textForContribution(post)
  },

  textForComment: function (comment, version, locale = 'en') {
    const person = comment.relations.user.get('name')
    const { media } = comment.relations
    if (media && media.length !== 0) {
      // return `${person} sent an image` // Question: do we want to start adding more text detail here?
      return locales[locale].textForCommentImage(person)
    }
    const blurb = TextHelpers.presentHTMLToText(comment.text(), { truncate: 140 })
    const postName = comment.relations.post.summary()

    return version === 'mention'
      ? locales[locale].textForCommentMention({person, blurb, postName})
      : locales[locale].textForComment({person, blurb, postName})
  },

  textForPost: function (post, group, firstTag, version, locale) {
    const person = post.relations.user.get('name')
    const postName = decode(post.summary())
    const groupName = group.get('name')

    switch (version) {
      case 'mention':
        return locales[locale].textForPostMention({ groupName, person, postName })
      case 'voteReset':
        return locales[locale].textForVoteReset({ person, postName, groupName })
      default:
        return locales[locale].textForPost({ person, postName, groupName, firstTag })
    }
  },

  textForAnnouncement: function (post, group, locale) {
    const person = post.relations.user.get('name')
    const postName = decode(post.summary())
    const groupName = group.get('name')

    return locales[locale].textForAnnouncement({ groupName, person, postName })
  },

  textForEventInvitation: function (post, actor, locale) {
    const postName = decode(post.summary())

    return locales[locale].textForEventInvitation({actor, postName})
  },

  textForJoinRequest: function (group, actor, locale) {
    return locales[locale].textForJoinRequest({actor, groupName: group.get('name')})
  },

  textForApprovedJoinRequest: function (group, actor, locale) {
    return locales[locale].textForApprovedJoinRequest({actor, groupName: group.get('name')})
  },

  textForGroupChildGroupInvite: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupChildGroupInvite({actor, parentGroup, childGroup})
  },

  textForGroupChildGroupInviteAcceptedParentModerator: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupChildGroupInviteAcceptedParentModerator({actor, parentGroup, childGroup})
  },

  textForGroupChildGroupInviteAcceptedParentMember: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupChildGroupInviteAcceptedParentMember({parentGroup, childGroup})
  },

  textForGroupChildGroupInviteAcceptedChildModerator: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupChildGroupInviteAcceptedChildModerator({parentGroup, childGroup})
  },

  textForGroupChildGroupInviteAcceptedChildMember: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupChildGroupInviteAcceptedChildMember({parentGroup, childGroup})
  },

  textForGroupParentGroupJoinRequest: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupParentGroupJoinRequest({actor, parentGroup, childGroup})
  },

  textForGroupParentGroupJoinRequestAcceptedParentModerator: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupParentGroupJoinRequestAcceptedParentModerator({parentGroup, childGroup, actor})
  },

  textForGroupParentGroupJoinRequestAcceptedParentMember: function (parentGroup, childGroup, locale) {
    return locales[locale].textForGroupParentGroupJoinRequestAcceptedParentMember({parentGroup, childGroup})
  },

  textForGroupParentGroupJoinRequestAcceptedChildModerator: function (parentGroup, childGroup, actor, locale) {
    return locales[locale].textForGroupParentGroupJoinRequestAcceptedChildModerator({parentGroup, childGroup, actor})
  },

  textForGroupParentGroupJoinRequestAcceptedChildMember: function (parentGroup, childGroup, locale) {
    return locales[locale].textForGroupParentGroupJoinRequestAcceptedChildMember({parentGroup, childGroup})
  },

  textForDonationTo: function (contribution) {
    const project = contribution.relations.project
    const postName = decode(project.summary())
    const amount = contribution.get('amount') / 100

    return locales[locale].textForDonationTo({postName, amount})
  },

  textForDonationFrom: function (contribution) {
    const actor = contribution.relations.user
    const project = contribution.relations.project
    const postName = decode(project.summary())

    const amount = contribution.get('amount') / 100
    return locales[locale].textForDonationFrom({actor, postName, amount})
  }
})
