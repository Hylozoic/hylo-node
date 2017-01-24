var url = require('url')
import { isEmpty } from 'lodash'
import decode from 'ent/decode'

module.exports = bookshelf.Model.extend({
  tableName: 'notifications',

  activity: function () {
    return this.belongsTo(Activity)
  },

  post: function () {
    return this.relations.activity.relations.post
  },

  contribution: function () {
    return this.relations.activity.relations.contribution
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

  send: function () {
    var action
    switch (this.get('medium')) {
      case Notification.MEDIUM.Push:
        action = this.sendPush()
        break
      case Notification.MEDIUM.Email:
        action = this.sendEmail()
        break
      case Notification.MEDIUM.InApp:
        action = User.incNewNotificationCount(this.reader().id)
        break
    }
    if (action) {
      return action
      .then(() => this.save({'sent_at': (new Date()).toISOString()}))
    } else {
      return Promise.resolve()
    }
  },

  sendPush: function () {
    switch (Notification.priorityReason(this.relations.activity.get('meta').reasons)) {
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
      default:
        return Promise.resolve()
    }
  },

  sendPostPush: function (version) {
    var post = this.post()
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(post, community)).path
      var alertText = PushNotification.textForPost(post, community, this.relations.activity.get('reader_id'), version)
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendContributionPush: function (version) {
    var contribution = this.contribution()
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(contribution.relations.post, community)).path
      var alertText = PushNotification.textForContribution(contribution, version)
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendCommentPush: function (version) {
    var comment = this.comment()
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(comment.relations.post, community)).path
      var alertText = PushNotification.textForComment(comment, version)
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendJoinRequestPush: function () {
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.communityJoinRequests(community)).path
      var alertText = PushNotification.textForJoinRequest(community, this.actor())
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendApprovedJoinRequestPush: function () {
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.community(community)).path
      var alertText = PushNotification.textForApprovedJoinRequest(community, this.actor())
      return this.reader().sendPushNotification(alertText, path)
    })
  },

  sendEmail: function () {
    switch (Notification.priorityReason(this.relations.activity.get('meta').reasons)) {
      case 'mention':
        return this.sendPostMentionEmail()
      case 'commentMention':
        return this.sendCommentNotificationEmail('mention')
      case 'newComment':
        return this.sendCommentNotificationEmail()
      case 'joinRequest':
        return this.sendJoinRequestEmail()
      case 'approvedJoinRequest':
        return this.sendApprovedJoinRequestEmail()
      default:
        return Promise.resolve()
    }
  },

  sendPostMentionEmail: function () {
    var post = this.post()
    var reader = this.reader()
    var user = post.relations.user
    var description = RichText.qualifyLinks(post.get('description'))
    var replyTo = Email.postReplyAddress(post.id, reader.id)

    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => reader.generateToken()
      .then(token => Email.sendPostMentionNotification({
        email: reader.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: format('%s (via Hylo)', user.get('name'))
        },
        data: {
          community_name: community.get('name'),
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
            Frontend.Route.unfollow(post, community) + '?ctt=post_mention_email&cti=' + reader.id),
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
        postLabel = format("%s's welcoming post", relatedUser.get('name'))
      }
    }

    const communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => reader.generateToken()
      .then(token => Email.sendNewCommentNotification({
        version: version,
        email: reader.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: format('%s (via Hylo)', commenter.get('name'))
        },
        data: {
          community_name: community.get('name'),
          commenter_name: commenter.get('name'),
          commenter_avatar_url: commenter.get('avatar_url'),
          commenter_profile_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.profile(commenter) + '?ctt=comment_email&cti=' + reader.id),
          comment_text: text,
          post_label: postLabel,
          post_title: title,
          comment_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post) + '?ctt=comment_email&cti=' + reader.id + `#comment-${comment.id}`),
          unfollow_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.unfollow(post, community)),
          tracking_pixel_url: Analytics.pixelUrl('Comment', {userId: reader.id})
        }
      })))
  },

  sendJoinRequestEmail: function () {
    const actor = this.actor()
    const reader = this.reader()
    const communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => reader.generateToken()
      .then(token => Email.sendJoinRequestNotification({
        email: reader.get('email'),
        sender: {name: community.get('name')},
        data: {
          community_name: community.get('name'),
          requester_name: actor.get('name'),
          requester_avatar_url: actor.get('avatar_url'),
          requester_profile_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.profile(actor) +
            `?ctt=comment_email&cti=${reader.id}&check-join-requests=1`),
          settings_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.communityJoinRequests(community))
        }
      })))
  },

  sendApprovedJoinRequestEmail: function () {
    const actor = this.actor()
    const reader = this.reader()
    const communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) throw new Error('no community ids in activity')
    return Community.find(communityIds[0])
    .then(community => reader.generateToken()
      .then(token => Email.sendApprovedJoinRequestNotification({
        email: reader.get('email'),
        sender: {name: community.get('name')},
        data: {
          community_name: community.get('name'),
          community_avatar_url: community.get('avatar_url'),
          approver_name: actor.get('name'),
          approver_avatar_url: actor.get('avatar_url'),
          approver_profile_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.profile(actor) + '?ctt=comment_email&cti=' + reader.id),
          community_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.community(community))
        }
      })))
  }

}, {

  MEDIUM: {
    InApp: 'in-app',
    Push: 'push',
    Email: 'email'
  },

  TYPE: {
    Mention: 'mention', // you are mentioned in a post or comment
    TagFollow: 'TagFollow',
    NewPost: 'newPost',
    Comment: 'comment', // someone makes a comment on a post you follow
    Contribution: 'contribution', // someone makes a comment on a post you follow
    FollowAdd: 'followAdd', // you are added as a follower
    Follow: 'follow', // someone follows your post
    Unfollow: 'unfollow', // someone leaves your post
    Welcome: 'welcome', // a welcome post
    JoinRequest: 'joinRequest',
    ApprovedJoinRequest: 'approvedJoinRequest'
  },

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    return Notification.where({id: id}).fetch(options)
  },

  findUnsent: function (options = {}) {
    const { raw } = bookshelf.knex
    return Notification.query(q => {
      q.where({sent_at: null})
      if (!options.includeOld) {
        q.where('created_at', '>', raw("now() - interval '6 hour'"))
      }
      q.where(function () {
        this.where('failed_at', null)
        .orWhere('failed_at', '<', raw("now() - interval '1 hour'"))
      })
      q.limit(200)
    })
    .fetchAll(options)
  },

  sendUnsent: function () {
    return Notification.findUnsent({withRelated: [
      'activity',
      'activity.post',
      'activity.post.communities',
      'activity.post.user',
      'activity.comment',
      'activity.comment.user',
      'activity.comment.post',
      'activity.comment.post.user',
      'activity.comment.post.relatedUsers',
      'activity.comment.post.communities',
      'activity.community',
      'activity.reader',
      'activity.actor'
    ]})
    .then(ns => ns.length > 0 &&
      Promise.each(ns.models,
        n => n.send().catch(() =>
          n.save({failed_at: new Date()}, {patch: true})))
      .then(() => Notification.sendUnsent()))
  },

  priorityReason: function (reasons) {
    const orderedLabels = [
      'mention', 'commentMention', 'newComment', 'newContribution', 'tag', 'newPost', 'follow',
      'followAdd', 'unfollow', 'joinRequest', 'approvedJoinRequest'
    ]

    const match = label => reasons.some(r => r.match(new RegExp('^' + label)))
    return orderedLabels.find(match) || ''
  }
})
