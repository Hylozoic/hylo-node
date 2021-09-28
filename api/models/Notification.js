import url from 'url'
import { isEmpty } from 'lodash'
import { get, includes } from 'lodash/fp'
import decode from 'ent/decode'
import { refineOne } from './util/relations'
import rollbar from '../../lib/rollbar'
import { broadcast, userRoom } from '../services/Websockets'

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
    return this.relations.activity.relations.post
  },

  comment: function () {
    return this.relations.activity.relations.comment
  },

  reader: function () {
    return this.relations.activity.relations.reader
  },

  actor: function () {
    return this.relations.activity.relations.actor
  },

  projectContribution: function () {
    return this.relations.activity.relations.projectContribution
  },

  send: function () {
    var action
    return this.shouldBeBlocked()
    .then(shouldBeBlocked => {
      if (shouldBeBlocked) {
        this.destroy()
        return Promise.resolve()
      }
      switch (this.get('medium')) {
        case MEDIUM.Push:
          action = this.sendPush()
          break
        case MEDIUM.Email:
          action = this.sendEmail()
          break
        case MEDIUM.InApp:
          const userId = this.reader().id
          action = User.incNewNotificationCount(userId)
            .then(() => this.updateUserSocketRoom(userId))
          break
      }
      if (action) {
        return action
          .then(() => this.save({'sent_at': (new Date()).toISOString()}))
      } else {
        return Promise.resolve()
      }
    })
  },

  sendPush: function () {
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
      case 'newPost':
        return this.sendPostPush()
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
      case 'donation to':
        return this.sendPushDonationTo()
      case 'donation from':
        return this.sendPushDonationFrom()
      default:
        return Promise.resolve()
    }
  },

  sendEventInvitationPush: function () {
    const post = this.post()
    const actor = this.actor()
    const groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => {
        var path = url.parse(Frontend.Route.post(post, group)).path
        var alertText = PushNotification.textForEventInvitation(post, actor)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendPushAnnouncement: function (version) {
    var post = this.post()
    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
      .then(group => {
        var path = url.parse(Frontend.Route.post(post, group)).path
        var alertText = PushNotification.textForAnnouncement(post)
        return this.reader().sendPushNotification(alertText, path)
      })
  },

  sendPostPush: function (version) {
    var post = this.post()
    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => {
      var path = url.parse(Frontend.Route.post(post, group)).path
      var alertText = PushNotification.textForPost(post, group, this.relations.activity.get('reader_id'), version)
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendContributionPush: function (version) {
    return this.load(['contribution', 'contribution.post'])
    .then(() => {
      const { contribution } = this.relations.activity.relations
      var path = url.parse(Frontend.Route.post(contribution.relations.post)).path
      var alertText = PushNotification.textForContribution(contribution, version)
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendCommentPush: function (version) {
    var comment = this.comment()
    var path = url.parse(Frontend.Route.post(comment.relations.post)).path
    var alertText = PushNotification.textForComment(comment, version)
    if (!this.reader().enabledNotification(TYPE.Comment, MEDIUM.Push)) {
      return Promise.resolve()
    }
    return this.reader().sendPushNotification(alertText, path)
  },

  sendJoinRequestPush: function () {
    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => {
      var path = url.parse(Frontend.Route.groupJoinRequests(group)).path
      var alertText = PushNotification.textForJoinRequest(group, this.actor())
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendApprovedJoinRequestPush: function () {
    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => {
      var path = url.parse(Frontend.Route.group(group)).path
      var alertText = PushNotification.textForApprovedJoinRequest(group, this.actor())
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendGroupChildGroupInvitePush: async function () {
    const childGroup = await this.relations.activity.otherGroup().fetch()
    const parentGroup = await this.relations.activity.group().fetch()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const path = url.parse(Frontend.Route.groupRelationshipInvites(childGroup)).path
    const alertText = PushNotification.textForGroupChildGroupInvite(parentGroup, childGroup, this.actor())
    return this.reader().sendPushNotification(alertText, path)
  },

  sendGroupChildGroupInviteAcceptedPush: async function () {
    const childGroup = await this.relations.activity.group().fetch()
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const reason = this.relations.activity.get('meta').reasons[0]
    const whichGroupMember = reason.split(':')[1]
    const groupMemberType = reason.split(':')[2]
    let alertPath, alertText
    if (whichGroup === 'parent' && groupMemberType === 'moderator') {
      alertPath = url.parse(Frontend.Route.group(childGroup)).path
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedParentModerator(parentGroup, childGroup, this.actor())
    } else if (whichGroup === 'parent' && groupMemberType === 'member') {
      alertPath = url.parse(Frontend.Route.group(childGroup)).path
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedParentMember(parentGroup, childGroup, this.actor())
    } else if (whichGroup === 'child' && groupMemberType === 'moderator') {
      alertPath = url.parse(Frontend.Route.group(parentGroup)).path
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedChildModerator(parentGroup, childGroup, this.actor())
    } else if (whichGroup === 'child' && groupMemberType === 'member') {
      alertPath = url.parse(Frontend.Route.group(parentGroup)).path
      alertText = PushNotification.textForGroupChildGroupInviteAcceptedChildMember(parentGroup, childGroup, this.actor())
    }
    return this.reader().sendPushNotification(alertText, alertPath)
  },

  sendGroupParentGroupJoinRequestPush: async function () {
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    const childGroup = await this.relations.activity.group().fetch()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const path = url.parse(Frontend.Route.groupRelationshipJoinRequests(parentGroup)).path
    const alertText = PushNotification.textForGroupParentGroupJoinRequest(parentGroup, childGroup, this.actor())
    return this.reader().sendPushNotification(alertText, path)
  },

  sendGroupParentGroupJoinRequestAcceptedPush: async function () {
    const parentGroup = await this.relations.activity.otherGroup().fetch()
    const childGroup = await this.relations.activity.group().fetch()
    if (!childGroup || !parentGroup) throw new Error('Missing a group in activity')
    const reason = this.relations.activity.get('meta').reasons[0]
    const whichGroupMember = reason.split(':')[1]
    const groupMemberType = reason.split(':')[2]
    let alertPath, alertText
    if (whichGroup === 'parent' && groupMemberType === 'moderator') {
      alertPath = url.parse(Frontend.Route.group(childGroup)).path
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedParentModerator(parentGroup, childGroup, this.actor())
    } else if (whichGroup === 'parent' && groupMemberType === 'member') {
      alertPath = url.parse(Frontend.Route.group(childGroup)).path
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedParentMember(parentGroup, childGroup, this.actor())
    } else if (whichGroup === 'child' && groupMemberType === 'moderator') {
      alertPath = url.parse(Frontend.Route.group(parentGroup)).path
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedChildModerator(parentGroup, childGroup, this.actor())
    } else if (whichGroup === 'child' && groupMemberType === 'member') {
      alertPath = url.parse(Frontend.Route.group(parentGroup)).path
      alertText = PushNotification.textForGroupParentGroupJoinRequestAcceptedChildMember(parentGroup, childGroup, this.actor())
    }
    return this.reader().sendPushNotification(alertText, alertPath)
  },

  sendPushDonationTo: async function () {
    await this.load(['activity.reader', 'activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    var projectContribution = this.projectContribution()
    var path = url.parse(Frontend.Route.post(projectContribution.relations.project)).path
    var alertText = PushNotification.textForDonationTo(projectContribution)
    return this.reader().sendPushNotification(alertText, path)
  },

  sendPushDonationFrom: async function () {
    await this.load(['activity.reader', 'activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    var projectContribution = this.projectContribution()
    var path = url.parse(Frontend.Route.post(projectContribution.relations.project)).path
    var alertText = PushNotification.textForDonationFrom(projectContribution)
    return this.reader().sendPushNotification(alertText, path)
  },

  sendEmail: function () {
    switch (Notification.priorityReason(this.relations.activity.get('meta').reasons)) {
      case 'mention':
        return this.sendPostMentionEmail()
      case 'joinRequest':
        return this.sendJoinRequestEmail()
      case 'approvedJoinRequest':
        return this.sendApprovedJoinRequestEmail()
      case 'announcement':
        return this.sendAnnouncementEmail()
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
    var post = this.post()
    var reader = this.reader()
    var user = post.relations.user
    var description = RichText.qualifyLinks(post.get('description'))
    var replyTo = Email.postReplyAddress(post.id, reader.id)

    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => reader.generateToken()
      .then(token => Email.sendAnnouncementNotification({
        version: 'Holonic architecture',
        email: reader.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: `${user.get('name')} (via Hylo)`
        },
        data: {
          group_name: group.get('name'),
          post_user_name: user.get('name'),
          post_user_avatar_url: Frontend.Route.tokenLogin(reader, token,
            user.get('avatar_url') + '?ctt=announcement_email&cti=' + reader.id),
          post_user_profile_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.profile(user) + '?ctt=announcement_email&cti=' + reader.id),
          post_description: description,
          post_title: decode(post.get('name')),
          post_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post, group) + '?ctt=announcement_email&cti=' + reader.id),
          unfollow_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.unfollow(post, group) + '?ctt=announcement_email&cti=' + reader.id),
          tracking_pixel_url: Analytics.pixelUrl('Announcement', {userId: reader.id})
        }
      })))
  },

  sendPostMentionEmail: function () {
    var post = this.post()
    var reader = this.reader()
    var user = post.relations.user
    var description = RichText.qualifyLinks(post.get('description'))
    var replyTo = Email.postReplyAddress(post.id, reader.id)

    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => reader.generateToken()
      .then(token => Email.sendPostMentionNotification({
        version: 'Holonic architecture',
        email: reader.get('email'),
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
          post_description: description,
          post_title: decode(post.get('name')),
          post_type: 'conversation',
          post_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post) + '?ctt=post_mention_email&cti=' + reader.id),
          unfollow_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.unfollow(post, group) + '?ctt=post_mention_email&cti=' + reader.id),
          tracking_pixel_url: Analytics.pixelUrl('Mention in Post', {userId: reader.id})
        }
      })))
  },

  // version corresponds to names of versions in SendWithUs
  sendCommentNotificationEmail: function (version) {
    const comment = this.comment()
    const reader = this.reader()
    if (!comment) return

    const post = comment.relations.post
    const commenter = comment.relations.user
    const text = RichText.qualifyLinks(comment.get('text'))
    const replyTo = Email.postReplyAddress(post.id, reader.id)
    const title = decode(post.get('name'))

    var postLabel = `"${title}"`
    if (post.get('type') === 'welcome') {
      var relatedUser = post.relations.relatedUsers.first()
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
          comment_text: text,
          post_label: postLabel,
          post_title: title,
          comment_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post, group) + '?ctt=comment_email&cti=' + reader.id + `#comment-${comment.id}`),
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
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => reader.generateToken()
      .then(token => Email.sendJoinRequestNotification({
        version: 'Holonic architecture',
        email: reader.get('email'),
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
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => reader.generateToken()
      .then(token => Email.sendApprovedJoinRequestNotification({
        version: 'Holonic architecture',
        email: reader.get('email'),
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
    if (!childGroup || !parentGroup) throw new Error('Missing group in activity')
    const token = reader.generateToken()
    Email.sendGroupChildGroupInviteNotification({
      email: reader.get('email'),
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
    Email.sendGroupChildGroupInviteAcceptedNotification({
      version: whichGroupMember + '-' + groupMemberType,
      email: reader.get('email'),
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
    if (!childGroup || !parentGroup) throw new Error('Missing group in activity')
    const token = reader.generateToken()
    Email.sendGroupParentGroupJoinRequestNotification({
      email: reader.get('email'),
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
    Email.sendGroupParentGroupJoinRequestAcceptedNotification({
      version: whichGroupMember + '-' + groupMemberType,
      email: reader.get('email'),
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
    await this.load(['activity.actor', 'activity.post', 'activity.reader', 'activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    const projectContribution = this.projectContribution()
    const project = this.post()
    const actor = this.actor()
    const reader = this.reader()
    const token = await reader.generateToken()
    return Email.sendDonationToEmail({
      email: reader.get('email'),
      sender: {name: project.get('name')},
      data: {
        project_title: project.get('name'),
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
    await this.load(['activity.actor', 'activity.post', 'activity.reader', 'activity.projectContribution', 'activity.projectContribution.project', 'activity.projectContribution.user'])
    const projectContribution = this.projectContribution()
    const project = this.post()
    const actor = this.actor()
    const reader = this.reader()
    const token = await reader.generateToken()
    return Email.sendDonationFromEmail({
      email: reader.get('email'),
      sender: {name: project.get('name')},
      data: {
        project_title: project.get('name'),
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
    var post = this.post()
    var reader = this.reader()
    var inviter = this.actor()
    var description = RichText.qualifyLinks(post.get('description'))
    var replyTo = Email.postReplyAddress(post.id, reader.id)

    var groupIds = Activity.groupIds(this.relations.activity)
    if (isEmpty(groupIds)) throw new Error('no group ids in activity')
    return Group.find(groupIds[0])
    .then(group => reader.generateToken()
      .then(token => Email.sendEventInvitationEmail({
        version: 'Holonic architecture',
        email: reader.get('email'),
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
          post_description: description,
          post_title: decode(post.get('name')),
          post_type: 'event',
          post_date: post.prettyEventDates(),
          post_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post) + '?ctt=post_mention_email&cti=' + reader.id),
          unfollow_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.unfollow(post, group) + '?ctt=post_mention_email&cti=' + reader.id),
          tracking_pixel_url: Analytics.pixelUrl('Mention in Post', {userId: reader.id})
        }
      })))
  },

  shouldBeBlocked: async function () {
    if (!this.get('user_id')) return Promise.resolve(false)

    const blockedUserIds = (await BlockedUser.blockedFor(this.get('user_id'))).rows.map(r => r.user_id)
    if (blockedUserIds.length === 0) return Promise.resolve(false)

      // TODO: add , 'activity.actor', 'activity.reader'
    await this.load(['activity', 'activity.post', 'activity.post.user', 'activity.comment', 'activity.comment.user'])
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

  updateUserSocketRoom: function (userId) {
    const { activity } = this.relations
    const { actor, comment, group, otherGroup, post } = activity.relations
    const action = Notification.priorityReason(activity.get('meta').reasons)

    const payload = {
      id: '' + this.id,
      activity: Object.assign({},
        refineOne(activity, [ 'created_at', 'id', 'meta', 'unread' ]),
        {
          action,
          actor: refineOne(actor, [ 'avatar_url', 'id', 'name' ]),
          comment: refineOne(comment, [ 'id', 'text' ]),
          group: refineOne(group, [ 'id', 'name', 'slug' ]),
          otherGroup: refineOne(otherGroup, [ 'id', 'name', 'slug' ]),
          post: refineOne(
            post,
            [ 'id', 'name', 'description' ],
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
    return Notification.where({id: id}).fetch(options)
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
          rollbar.error(err, null, {notification: n.attributes})
          return n.save({failed_at: new Date()}, {patch: true})
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
