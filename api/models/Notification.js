var url = require('url')
import { isEmpty } from 'lodash'
import emitter from 'socket.io-emitter'
import decode from 'ent/decode'
import parseRedisUrl from 'parse-redis-url'

import { userRoom } from '../services/Websockets'

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
  JoinRequest: 'joinRequest',
  ApprovedJoinRequest: 'approvedJoinRequest',
  Message: 'message'
}

const MEDIUM = {
  InApp: 0,
  Push: 1,
  Email: 2
}

module.exports = bookshelf.Model.extend({
  tableName: 'notifications',

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

  send: function () {
    var action
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
          name: `${user.get('name')} (via Hylo)`
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
        postLabel = `${relatedUser.get('name')}'s welcoming post`
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
          name: `${commenter.get('name')} (via Hylo)`
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
            Frontend.Route.post(post, community) + '?ctt=comment_email&cti=' + reader.id + `#comment-${comment.id}`),
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
  },

  updateUserSocketRoom: function (userId) {
    const actor = Object.assign({},
      this.actor().pick([ 'id', 'name' ]),
      { avatarUrl: this.actor().get('avatar_url') }
    )
    const comment = this.comment().pick([ 'id', 'text' ])
    const community = this.relations.activity.relations.community.pick([ 'id', 'name', 'slug' ])
    const post = { id: this.post().id, title: this.post().get('name') }
    const payload = {
      id: '' + this.id,
      createdAt: this.get('created_at'),
      activity: Object.assign({},
        this.relations.activity.pick([ 'action', 'id', 'meta', 'unread' ]),
        { actor, comment, community, post })
    }

    const redisInfo = parseRedisUrl().parse(process.env.REDIS_URL)
    const io = emitter(redisInfo)
    io.on('error', err => console.error(`Socket error on newNotification: ${err}`))
    io.redis.on('error', err => console.error(`
      Redis error: ${JSON.stringify(err)}
      while attempting to send notification via socket from actor: ${JSON.stringify(actor)}
      in community ${JSON.stringify(community)}
    `))
    io.in(userRoom(userId)).emit('newNotification', payload)
  }
}, {
  MEDIUM,
  TYPE,

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
    // FIXME empty out this withRelated list and just load things on demand when
    // creating push notifications / emails
    return Notification.findUnsent({withRelated: [
      'activity',
      'activity.post',
      'activity.post.communities',
      'activity.post.user',
      'activity.comment',
      'activity.comment.media',
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
  },

  removeOldNotifications: function () {
    return Notification.query()
    .whereRaw("created_at < now() - interval '1 month'")
    .del()
  }
})
