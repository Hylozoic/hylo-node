import url from 'url'
import { isEmpty } from 'lodash'
import { get, includes } from 'lodash/fp'
import decode from 'ent/decode'
import { TextHelpers } from 'hylo-shared'
import { refineOne } from './util/relations'
import rollbar from '../../lib/rollbar'
import { broadcast, userRoom } from '../services/Websockets'
import { getSlug } from '../services/Frontend'

const TYPE = {
  Mention: 'mention', // you are mentioned in a post or comment
  TagFollow: 'TagFollow',
  NewPost: 'newPost',
  Comment: 'comment', // someone makes a comment on a post you follow
  Contribution: 'contribution', // you are added as a contributor
  FollowAdd: 'followAdd', // you are added as a follower
  Follow: 'follow', // someone follows your post
  Unfollow: 'unfollow', // someone leaves your post
  Welcome: 'welcome', // a welcome post
  JoinRequest: 'joinRequest', // Someone asks to join a group
  ApprovedJoinRequest: 'approvedJoinRequest', // A request to join a group is approved
  GroupChildGroupInvite: 'groupChildGroupInvite', // A child group is invited to join a parent group
  GroupChildGroupInviteAccepted: 'groupChildGroupInviteAccepted',
  GroupParentGroupJoinRequest: 'groupParentGroupJoinRequest', // A child group is requesting to join a parent group
  GroupParentGroupJoinRequestAccepted: 'groupParentGroupJoinRequestAccepted',
  Message: 'message',
  Announcement: 'announcement',
  DonationTo: 'donation to',
  DonationFrom: 'donation from'
}

const MEDIUM = {
  InApp: 0,
  Push: 1,
  Email: 2
}

module.exports = bookshelf.Model.extend({
  tableName: 'notifications',
  requireFetch: false,
  hasTimestamps: true,

  activity: function () {
    return this.belongsTo(Activity)
  },

  post: function () {
    return this.related('activity').related('post')
  },

  comment: function () {
    return this.related('activity').related('comment')
  },

  reader: function () {
    return this.related('activity').related('reader')
  },

  actor: function () {
    return this.related('activity').related('actor')
  },

  projectContribution: function () {
    return this.relations.activity.relations.projectContribution
  },

  locale: function () {
    return this.reader().get('settings')?.locale || this.actor().getLocale()
  },

  postUrlHelper: function ({ post, group, isPublic = false, topic, reader }) {
    if (post.get('type') === Post.Type.CHAT) {
      return Frontend.Route.chatPostForMobile(post, group, topic)
    }
    return Frontend.Route.post(post, group, isPublic, topic)
  },

  send: async function () {
    if (await this.shouldBeBlocked()) {
      this.destroy()
      return
    }
    switch (this.get('medium')) {
      case MEDIUM.Push:
        await this.sendPush()
        break
      case MEDIUM.Email:
        await this.sendEmail()
        break
      case MEDIUM.InApp: {
        const userId = this.reader().id
        await User.incNewNotificationCount(userId)
        await this.updateUserSocketRoom(userId)
        break
      }
    }
    this.save({ sent_at: (new Date()).toISOString() })
    return Promise.resolve()
  },

  sendPush: async function () {
    switch (Notification.priorityReason(this.relations.activity.get('meta').reasons)) {
      case 'eventInvitation':
        return this.sendEventInvitationPush()
      case 'mention':
        return this.sendPostPush('mention')
      case 'commentMention':
        return this.sendCommentPush('mention')
      case 'newComment':
        return this.sendCommentPush()
      case 'newContribution':
        return this.sendContributionPush()
      case 'joinRequest':
        return this.sendJoinRequestPush()
      case 'approvedJoinRequest':
        return this.sendApprovedJoinRequestPush()
      case 'groupChildGroupInvite':
        return this.sendGroupChildGroupInvitePush()
      case 'groupChildGroupInviteAccepted':
        return this.sendGroupChildGroupInviteAcceptedPush()
      case 'groupParentGroupJoinRequest':
        return this.sendGroupParentGroupJoinRequestPush()
      case 'groupParentGroupJoinRequestAccepted':
        return this.sendGroupParentGroupJoinRequestAcceptedPush()
      case 'announcement':
        return this.sendPushAnnouncement()
      case 'tag':
      case 'newPost':
        return this.sendPostPush()
      case 'donation to':
        return this.sendPushDonationTo()
      case 'donation from':
        return this.sendPushDonationFrom()
      case 'voteReset':
        return this.sendPostPush('voteReset')
      default:
        return Promise.resolve()
    }
  },

  sendEventInvitationPush: function () {
    const post = this.post()
    const actor = this.actor()
    const locale = this.locale()
    const groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => {
        const path = new URL(Frontend.Route.post(post, group)).pathname
        const alertText = PushNotification.textForEventInvitation(post, actor, locale)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendPushAnnouncement: function (version) {
    const post = this.post()
    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => {
        const path = new URL(Frontend.Route.post(post, group)).pathname
        const alertText = PushNotification.textForAnnouncement(post, group, locale)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendPostPush: async function (version) {
    const post = this.post()
    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()
    const tags = post.relations.tags
    const firstTag = tags && tags.first()?.get('name')
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    // TODO: include all groups in the notification?
    return Group.find(groupIds[0])
      .then(group => {
        const path = new URL(this.postUrlHelper({ post, isPublic: false, topic: firstTag, group })).pathname
        const alertText = PushNotification.textForPost(post, group, firstTag, version, locale)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendContributionPush: function (version) {
    const locale = this.locale()
    return this.load(['contribution', 'contribution.post'])
      .then(() => {
        const { contribution } = this.relations.activity.relations
        const path = new URL(Frontend.Route.post(contribution.relations.post)).pathname
        const alertText = PushNotification.textForContribution(contribution, version, locale)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendCommentPush: function (version) {
    const comment = this.comment()
    const post = comment.relations.post
    const group = post.relations.groups.first()
    const locale = this.locale()
    const groupSlug = getSlug(group)
    const path = new URL(Frontend.Route.comment({ comment, groupSlug, post })).pathname
    const alertText = PushNotification.textForComment(comment, version, locale)
    if (!this.reader().enabledNotification(TYPE.Comment, MEDIUM.Push)) {
      return Promise.resolve()
    }
    return this.reader().sendPushNotification(alertText, path)
  },

  sendJoinRequestPush: function () {
    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => {
        const path = new URL(Frontend.Route.groupJoinRequests(group)).pathname
        const alertText = PushNotification.textForJoinRequest(group, this.actor(), locale)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendApprovedJoinRequestPush: function () {
    const groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    const locale = this.locale()
    return Group.find(groupIds[0])
      .then(group => {
        const path = new URL(Frontend.Route.group(group)).pathname
        const alertText = PushNotification.textForApprovedJoinRequest(group, this.actor(), locale)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendGroupChildGroupInvitePush: async function () {
    const childGroup = await this.relations.activity.otherGroup().fetch()
    const parentGroup = await this.relations.activity.group().fetch()
    const locale = this.locale()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const path = new URL(Frontend.Route.groupRelationshipInvites(childGroup)).pathname
    const alertText = PushNotification.textForGroupChildGroupInvite(parentGroup, childGroup, this.actor(), locale)
    return this.reader().sendPushNotification(alertText, path)
  },

  sendGroupChildGroupInviteAcceptedPush: async function () {
    const childGroup = await this.relations.activity.group().fetch()
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    const locale = this.locale()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const reason = this.relations.activity.get('meta').reasons[0]
    const whichGroup = reason.split(':')[1]
    const groupMemberType = reason.split(':')[2]
    let alertPath, alertText
    if (whichGroup === 'parent' && groupMemberType === 'moderator') {
      alertPath = new URL(Frontend.Route.group(childGroup)).pathname
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedParentModerator(parentGroup, childGroup, this.actor(), locale)
    } else if (whichGroup === 'parent' && groupMemberType === 'member') {
      alertPath = new URL(Frontend.Route.group(childGroup)).pathname
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedParentMember(parentGroup, childGroup, this.actor(), locale)
    } else if (whichGroup === 'child' && groupMemberType === 'moderator') {
      alertPath = new URL(Frontend.Route.group(parentGroup)).pathname
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedChildModerator(parentGroup, childGroup, this.actor(), locale)
    } else if (whichGroup === 'child' && groupMemberType === 'member') {
      alertPath = new URL(Frontend.Route.group(parentGroup)).pathname
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedChildMember(parentGroup, childGroup, this.actor(), locale)
    }
    return this.reader().sendPushNotification(alertText, alertPath)
  },

  sendGroupParentGroupJoinRequestPush: async function () {
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    const childGroup = await this.relations.activity.group().fetch()
    const locale = this.locale()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const path = new URL(Frontend.Route.groupRelationshipJoinRequests(parentGroup)).pathname
    const alertText = PushNotification.textForGroupParentGroupJoinRequest(parentGroup, childGroup, this.actor(), locale)
    return this.reader().sendPushNotification(alertText, path)
  },

  sendGroupParentGroupJoinRequestAcceptedPush: async function () {
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    const childGroup = await this.relations.activity.group().fetch()
    const locale = this.locale()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const reason = this.relations.activity.get('meta').reasons[0]
    const whichGroup = reason.split(':')[1]
    const groupMemberType = reason.split(':')[2]
    let alertPath, alertText
    if (whichGroup === 'parent' && groupMemberType === 'moderator') {
      alertPath = new URL(Frontend.Route.group(childGroup)).pathname
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedParentModerator(parentGroup, childGroup, this.actor(), locale)
    } else if (whichGroup === 'parent' && groupMemberType === 'member') {
      alertPath = new URL(Frontend.Route.group(childGroup)).pathname
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedParentMember(parentGroup, childGroup, locale)
    } else if (whichGroup === 'child' && groupMemberType === 'moderator') {
      alertPath = new URL(Frontend.Route.group(parentGroup)).pathname
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedChildModerator(parentGroup, childGroup, this.actor(), locale)
    } else if (whichGroup === 'child' && groupMemberType === 'member') {
      alertPath = new URL(Frontend.Route.group(parentGroup)).pathname
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedChildMember(parentGroup, childGroup, locale)
    }
    return this.reader().sendPushNotification(alertText, alertPath)
  },

  sendPushDonationTo: async function () {
    await this.load(['activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    const projectContribution = this.projectContribution()
    const locale = this.locale()
    const path = new URL(Frontend.Route.post(projectContribution.relations.project)).pathname
    const alertText = PushNotification.textForDonationTo(projectContribution, locale)
    return this.reader().sendPushNotification(alertText, path)
  },

  sendPushDonationFrom: async function () {
    await this.load(['activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    const projectContribution = this.projectContribution()
    const locale = this.locale()
    const path = new URL(Frontend.Route.post(projectContribution.relations.project)).pathname
    const alertText = PushNotification.textForDonationFrom(projectContribution, locale)
    return this.reader().sendPushNotification(alertText, path)
  },

  sendEmail: async function () {
    switch (Notification.priorityReason(this.relations.activity.get('meta').reasons)) {
      case 'mention':
        return this.sendPostMentionEmail()
      case 'joinRequest':
        return this.sendJoinRequestEmail()
      case 'approvedJoinRequest':
        return this.sendApprovedJoinRequestEmail()
      case 'announcement':
        return this.sendAnnouncementEmail()
      case 'newPost':
      case 'tag':
        return this.sendPostEmail()
      case 'donation to':
        return this.sendDonationToEmail()
      case 'donation from':
        return this.sendDonationFromEmail()
      case 'eventInvitation':
        return this.sendEventInvitationEmail()
      case 'groupChildGroupInvite':
        return this.sendGroupChildGroupInviteEmail()
      case 'groupChildGroupInviteAccepted':
        return this.sendGroupChildGroupInviteAcceptedEmail()
      case 'groupParentGroupJoinRequest':
        return this.sendGroupParentGroupJoinRequestEmail()
      case 'groupParentGroupJoinRequestAccepted':
        return this.sendGroupParentGroupJoinRequestAcceptedEmail()
      default:
        return Promise.resolve()
    }
  },

  sendAnnouncementEmail: function () {
    const post = this.post()
    const reader = this.reader()
    const user = post.relations.user
    const replyTo = Email.postReplyAddress(post.id, reader.id)

    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()

    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendPostNotification({
          version: 'All Posts',
          email: reader.get('email'),
          locale,
          sender: {
            address: replyTo,
            reply_to: replyTo,
            name: `${user.get('name')} (via Hylo)`
          },
          data: {
            announcement: true,
            group_name: group.get('name'),
            post_user_name: user.get('name'),
            post_user_avatar_url: Frontend.Route.tokenLogin(reader, token,
              user.get('avatar_url') + '?ctt=announcement_email&cti=' + reader.id),
            post_user_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(user) + '?ctt=announcement_email&cti=' + reader.id),
            post_description: RichText.qualifyLinks(post.details(), group.get('slug')),
            post_subject: decode(post.summary()),
            post_title: decode(post.title() || ''),
            post_type: post.get('type'),
            post_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.post(post, group) + '?ctt=announcement_email&cti=' + reader.id),
            unfollow_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.unfollow(post, group) + '?ctt=announcement_email&cti=' + reader.id),
            tracking_pixel_url: Analytics.pixelUrl('Announcement', { userId: reader.id }),
            post_date: post.get('start_time') ? TextHelpers.formatDatePair(post.get('start_time'), post.get('end_time'), false, post.get('timezone')) : null
          }
        })))
  },

  sendPostEmail: function () {
    const post = this.post()
    const reader = this.reader()
    const user = post.relations.user
    const tags = post.relations.tags
    const firstTag = tags && tags.first()?.get('name')
    const replyTo = Email.postReplyAddress(post.id, reader.id)

    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()

    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendPostNotification({
          version: 'All Posts',
          email: reader.get('email'),
          locale,
          sender: {
            address: replyTo,
            reply_to: replyTo,
            name: `${user.get('name')} (via Hylo)`
          },
          data: {
            group_name: group.get('name'),
            post_user_name: user.get('name'),
            post_user_avatar_url: Frontend.Route.tokenLogin(reader, token,
              user.get('avatar_url') + '?ctt=post_email&cti=' + reader.id),
            post_user_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(user) + '?ctt=post_email&cti=' + reader.id),
            post_description: RichText.qualifyLinks(post.details(), group.get('slug')),
            post_subject: decode(post.summary()),
            post_title: decode(post.title() || ''),
            post_topic: firstTag,
            post_type: post.get('type'),
            post_url: Frontend.Route.tokenLogin(reader, token, this.postUrlHelper({ post, isPublic: false, topic: firstTag, group }) + '?ctt=post_email&cti=' + reader.id),
            unfollow_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.unfollow(post, group) + '?ctt=post_email&cti=' + reader.id),
            tracking_pixel_url: Analytics.pixelUrl('Post', { userId: reader.id }),
            post_date: post.get('start_time') ? TextHelpers.formatDatePair(post.get('start_time'), post.get('end_time'), false, post.get('timezone')) : null
          }
        })))
  },

  sendPostMentionEmail: function () {
    const post = this.post()
    const reader = this.reader()
    const user = post.relations.user
    const tags = post.relations.tags
    const firstTag = tags && tags.first()?.get('name')
    const replyTo = Email.postReplyAddress(post.id, reader.id)
    const locale = this.locale()

    const groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')

    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendPostMentionNotification({
          version: 'Holonic architecture',
          email: reader.get('email'),
          locale,
          sender: {
            address: replyTo,
            reply_to: replyTo,
            name: `${user.get('name')} (via Hylo)`
          },
          data: {
            group_name: group.get('name'),
            post_user_name: user.get('name'),
            post_user_avatar_url: Frontend.Route.tokenLogin(reader, token,
              user.get('avatar_url') + '?ctt=post_mention_email&cti=' + reader.id),
            post_user_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(user) + '?ctt=post_mention_email&cti=' + reader.id),
            post_description: RichText.qualifyLinks(post.details(), group.get('slug')),
            post_title: decode(post.summary()),
            post_topic: firstTag,
            post_type: post.get('type'),
            post_url: Frontend.Route.tokenLogin(reader, token, this.postUrlHelper({ post, isPublic: false, topic: firstTag, group }) + '?ctt=post_mention_email&cti=' + reader.id ),
            unfollow_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.unfollow(post, group) + '?ctt=post_mention_email&cti=' + reader.id),
            tracking_pixel_url: Analytics.pixelUrl('Mention in Post', {userId: reader.id})
          }
        })))
  },

  // version corresponds to names of versions in SendWithUs
  // XXX: This is not used right now, we send Comment Digests instead
  sendCommentNotificationEmail: function (version) {
    const comment = this.comment()
    const reader = this.reader()
    if (!comment) return

    const post = comment.relations.post
    const commenter = comment.relations.user
    const replyTo = Email.postReplyAddress(post.id, reader.id)
    const title = decode(post.summary())
    const locale = this.locale()

    let postLabel = `"${title}"`
    if (post.get('type') === 'welcome') {
      const relatedUser = post.relations.relatedUsers.first()
      if (relatedUser.id === reader.id) {
        postLabel = 'your welcoming post'
      } else {
        postLabel = `${relatedUser.get('name')}'s welcoming post`
      }
    }

    const groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendNewCommentNotification({
          version: version,
          email: reader.get('email'),
          locale,
          sender: {
            address: replyTo,
            reply_to: replyTo,
            name: `${commenter.get('name')} (via Hylo)`
          },
          data: {
            group_name: group.get('name'),
            commenter_name: commenter.get('name'),
            commenter_avatar_url: commenter.get('avatar_url'),
            commenter_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(commenter) + '?ctt=comment_email&cti=' + reader.id),
            comment_text: RichText.qualifyLinks(comment.text(), group.get('slug')),
            post_label: postLabel,
            post_title: title,
            comment_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.comment({ comment, groupSlug: group.get('slug'), post })),
            unfollow_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.unfollow(post, group)),
            tracking_pixel_url: Analytics.pixelUrl('Comment', {userId: reader.id})
          }
        })))
  },

  sendJoinRequestEmail: function () {
    const actor = this.actor()
    const reader = this.reader()
    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendJoinRequestNotification({
          version: 'Holonic architecture',
          email: reader.get('email'),
          locale,
          sender: {name: group.get('name')},
          data: {
            group_name: group.get('name'),
            requester_name: actor.get('name'),
            requester_avatar_url: actor.get('avatar_url'),
            requester_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(actor) +
              `?ctt=join_request_email&cti=${reader.id}&check-join-requests=1`),
            settings_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.groupJoinRequests(group))
          }
        })))
  },

  sendApprovedJoinRequestEmail: function () {
    const actor = this.actor()
    const reader = this.reader()
    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()

    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendApprovedJoinRequestNotification({
          version: 'Holonic architecture',
          email: reader.get('email'),
          locale,
          sender: {name: group.get('name')},
          data: {
            group_name: group.get('name'),
            group_avatar_url: group.get('avatar_url'),
            approver_name: actor.get('name'),
            approver_avatar_url: actor.get('avatar_url'),
            approver_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(actor) + '?ctt=approved_join_request_email&cti=' + reader.id),
            group_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.group(group))
          }
        })))
  },

  sendGroupChildGroupInviteEmail: async function () {
    const actor = this.actor()
    const reader = this.reader()
    const childGroup = await this.relations.activity.otherGroup().fetch()
    const parentGroup = await this.relations.activity.group().fetch()
    const locale = this.locale()

    if (!childGroup || !parentGroup) throw new Error('Missing group in activity')
    const token = reader.generateToken()
    Email.sendGroupChildGroupInviteNotification({
      email: reader.get('email'),
      locale,
      sender: { name: actor.get('name') + ' from ' + parentGroup.get('name') },
      data: {
        parent_group_name: parentGroup.get('name'),
        child_group_name: childGroup.get('name'),
        inviter_name: actor.get('name'),
        parent_group_avatar_url: parentGroup.get('avatar_url'),
        inviter_profile_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.profile(actor) +
          `?ctt=group_child_group_invite_email&cti=${reader.id}`),
        parent_group_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.group(parentGroup)),
        child_group_settings_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.groupRelationshipInvites(childGroup))
      }
    })
  },

  sendGroupChildGroupInviteAcceptedEmail: async function () {
    const actor = this.actor()
    const reader = this.reader()
    const childGroup = await this.relations.activity.otherGroup().fetch()
    const parentGroup = await this.relations.activity.group().fetch()
    if (!childGroup || !parentGroup) throw new Error('Missing group in activity')
    const token = reader.generateToken()
    const reason = this.relations.activity.get('meta').reasons[0]
    const whichGroupMember = reason.split(':')[1]
    const groupMemberType = reason.split(':')[2]
    const locale = this.locale()

    Email.sendGroupChildGroupInviteAcceptedNotification({
      version: whichGroupMember + '-' + groupMemberType,
      email: reader.get('email'),
      locale,
      sender: { name: 'The Team at Hylo' },
      data: {
        parent_group_name: parentGroup.get('name'),
        child_group_name: childGroup.get('name'),
        child_group_avatar_url: childGroup.get('avatar_url'),
        accepter_name: actor.get('name'),
        child_group_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.group(childGroup)),
        parent_group_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.groupRelationships(parentGroup))
      }
    })
  },

  sendGroupParentGroupJoinRequestEmail: async function () {
    const actor = this.actor()
    const reader = this.reader()
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    const childGroup = await this.relations.activity.group().fetch()
    const locale = this.locale()

    if (!childGroup || !parentGroup) throw new Error('Missing group in activity')
    const token = reader.generateToken()
    Email.sendGroupParentGroupJoinRequestNotification({
      email: reader.get('email'),
      locale,
      sender: { name: actor.get('name') + ' from ' + childGroup.get('name') },
      data: {
        parent_group_name: parentGroup.get('name'),
        child_group_name: childGroup.get('name'),
        child_group_avatar_url: childGroup.get('avatar_url'),
        requester_name: actor.get('name'),
        requester_avatar_url: actor.get('avatar_url'),
        requester_profile_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.profile(actor) +
          `?ctt=group_parent_group_join_request_email&cti=${reader.id}`),
        child_group_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.group(childGroup)),
        parent_group_settings_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.groupRelationshipJoinRequests(parentGroup))
      }
    })
  },

  sendGroupParentGroupJoinRequestAcceptedEmail: async function () {
    const actor = this.actor()
    const reader = this.reader()
    const childGroup = await this.relations.activity.group().fetch()
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    if (!childGroup || !parentGroup) throw new Error('Missing group in activity')
    const token = reader.generateToken()
    const reason = this.relations.activity.get('meta').reasons[0]
    const whichGroupMember = reason.split(':')[1]
    const groupMemberType = reason.split(':')[2]
    const locale = this.locale()

    Email.sendGroupParentGroupJoinRequestAcceptedNotification({
      version: whichGroupMember + '-' + groupMemberType,
      email: reader.get('email'),
      locale,
      sender: { name: 'The Team at Hylo' },
      data: {
        parent_group_name: parentGroup.get('name'),
        child_group_name: childGroup.get('name'),
        child_group_avatar_url: childGroup.get('avatar_url'),
        accepter_name: actor.get('name'),
        child_group_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.group(childGroup)),
        parent_group_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.groupRelationships(parentGroup))
      }
    })
  },

  sendDonationToEmail: async function () {
    await this.load(['activity.post', 'activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    const projectContribution = this.projectContribution()
    const project = this.post()
    const actor = this.actor()
    const reader = this.reader()
    const token = await reader.generateToken()
    const locale = this.locale()

    return Email.sendDonationToEmail({
      email: reader.get('email'),
      locale,
      sender: { name: project.summary() },
      data: {
        project_title: project.summary(),
        project_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.post(project) + '?ctt=post_mention_email&cti=' + reader.id),
        contribution_amount: projectContribution.get('amount') / 100,
        contributor_name: actor.get('name'),
        contributor_avatar_url: actor.get('avatar_url'),
        contributor_profile_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.profile(actor) + '?ctt=comment_email&cti=' + reader.id),
      }
    })
  },

  sendDonationFromEmail: async function () {
    await this.load(['activity.post', 'activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    const projectContribution = this.projectContribution()
    const project = this.post()
    const actor = this.actor()
    const reader = this.reader()
    const token = await reader.generateToken()
    const locale = this.locale()

    return Email.sendDonationFromEmail({
      email: reader.get('email'),
      locale,
      sender: { name: project.summary() },
      data: {
        project_title: project.summary(),
        project_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.post(project) + '?ctt=post_mention_email&cti=' + reader.id),
        contribution_amount: projectContribution.get('amount') / 100,
        contributor_name: actor.get('name'),
        contributor_avatar_url: actor.get('avatar_url'),
        contributor_profile_url: Frontend.Route.tokenLogin(reader, token,
          Frontend.Route.profile(actor) + '?ctt=comment_email&cti=' + reader.id),
      }
    })
  },

  sendEventInvitationEmail: function () {
    const post = this.post()
    const reader = this.reader()
    const inviter = this.actor()
    const replyTo = Email.postReplyAddress(post.id, reader.id)
    const groupIds = Activity.groupIds(this.relations.activity)
    const locale = this.locale()

    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => reader.generateToken()
        .then(token => Email.sendEventInvitationEmail({
          version: 'Holonic architecture',
          email: reader.get('email'),
          locale,
          sender: {
            address: replyTo,
            reply_to: replyTo,
            name: `${inviter.get('name')} (via Hylo)`
          },
          data: {
            group_name: group.get('name'),
            post_user_name: inviter.get('name'),
            post_user_avatar_url: Frontend.Route.tokenLogin(reader, token,
              inviter.get('avatar_url') + '?ctt=post_mention_email&cti=' + reader.id),
            post_user_profile_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.profile(inviter) + '?ctt=post_mention_email&cti=' + reader.id),
            post_description: RichText.qualifyLinks(post.details(), group.get('slug')),
            post_title: decode(post.summary()),
            post_type: 'event',
            post_date: TextHelpers.formatDatePair(post.get('start_time'), post.get('end_time'), false, post.get('timezone')),
            post_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.post(post) + '?ctt=post_mention_email&cti=' + reader.id),
            unfollow_url: Frontend.Route.tokenLogin(reader, token,
              Frontend.Route.unfollow(post, group) + '?ctt=post_mention_email&cti=' + reader.id),
            tracking_pixel_url: Analytics.pixelUrl('Mention in Post', { userId: reader.id })
          }
        })))
  },

  shouldBeBlocked: async function () {
    if (!this.get('user_id')) return Promise.resolve(false)

    const blockedUserIds = (await BlockedUser.blockedFor(this.get('user_id'))).rows.map(r => r.user_id)
    if (blockedUserIds.length === 0) return Promise.resolve(false)

    const postCreatorId = get('relations.activity.relations.post.relations.user.id', this)
    const commentCreatorId = get('relations.activity.relations.comment.relations.user.id', this)
    const actorId = get('relations.activity.relations.actor.id', this)

    if (includes(postCreatorId, blockedUserIds)
      || includes(commentCreatorId, blockedUserIds)
      || includes(actorId, blockedUserIds)) {
      return Promise.resolve(true)
    }
    return Promise.resolve(false)
  },

  updateUserSocketRoom: async function (userId) {
    const { activity } = this.relations
    const { actor, comment, group, otherGroup, post } = activity.relations
    const action = Notification.priorityReason(activity.get('meta').reasons)

    const payload = {
      id: '' + this.id,
      activity: Object.assign({},
        refineOne(activity, ['created_at', 'id', 'meta', 'unread']),
        {
          action,
          actor: refineOne(actor, ['avatar_url', 'id', 'name']),
          comment: refineOne(comment, ['id', 'text']),
          group: refineOne(group, ['id', 'name', 'slug']),
          otherGroup: refineOne(otherGroup, ['id', 'name', 'slug']),
          post: refineOne(
            post,
            ['id', 'name', 'description'],
            { description: 'details', name: 'title' }
          )
        }
      )
    }

    broadcast(userRoom(userId), 'newNotification', payload)
  }
}, {
  MEDIUM,
  TYPE,

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    return Notification.where({ id: id }).fetch(options)
  },

  findUnsent: function (options = {}) {
    return Notification.query(q => {
      q.where({sent_at: null})
      if (!options.includeOld) {
        q.where('created_at', '>', bookshelf.knex.raw("now() - interval '6 hour'"))
      }
      q.where(function () {
        this.where('failed_at', null)
          .orWhere('failed_at', '<', bookshelf.knex.raw("now() - interval '1 hour'"))
      })
      q.limit(200)
    })
      .fetchAll(options)
  },

  sendUnsent: function () {
    // FIXME empty out this withRelated list and just load things on demand when
    // creating push notifications / emails
    return Notification.findUnsent({withRelated: [
      'activity',
      'activity.post',
      'activity.post.tags',
      'activity.post.groups',
      'activity.post.user',
      'activity.comment',
      'activity.comment.media',
      'activity.comment.user',
      'activity.comment.post',
      'activity.comment.post.user',
      'activity.comment.post.relatedUsers',
      'activity.comment.post.groups',
      'activity.group',
      'activity.otherGroup',
      'activity.reader',
      'activity.actor'
    ]})
      .then(ns => ns.length > 0 &&
        Promise.each(ns.models,
          n => n.send().catch(err => {
            console.error('Error sending notification', err, n.attributes)
            rollbar.error(err, null, { notification: n.attributes })
            return n.save({ failed_at: new Date() }, { patch: true })
          }))
          .then(() => new Promise(resolve => {
            setTimeout(() => resolve(Notification.sendUnsent()), 1000)
          })))
  },

  priorityReason: function (reasons) {
    const orderedLabels = [
      'donation to', 'donation from', 'announcement', 'eventInvitation', 'mention', 'commentMention', 'newComment', 'newContribution', 'tag',
      'newPost', 'follow', 'followAdd', 'unfollow', 'joinRequest', 'approvedJoinRequest', 'groupChildGroupInviteAccepted', 'groupChildGroupInvite',
      'groupParentGroupJoinRequestAccepted', 'groupParentGroupJoinRequest'
    ]

    const match = label => reasons.some(r => r.match(new RegExp('^' + label)))
    return orderedLabels.find(match) || ''
  },

  removeOldNotifications: function () {
    return Notification.query()
      .whereRaw("created_at < now() - interval '1 month'")
      .del()
  }
})
