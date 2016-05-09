var url = require('url')
import { isEmpty } from 'lodash'

const hasReason = (regex, reasons) => reasons.some(reason => reason.match(regex))

module.exports = bookshelf.Model.extend({

  tableName: 'notifications',

  activity: function () {
    return this.belongsTo(Activity)
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
    }
    if (action) {
      return action
      .then(() => this.save({'sent_at': (new Date()).toISOString()}))
    } else {
      return Promise.resolve()
    }
  },

  sendPush: function () {
    var reasons = this.relations.activity.get('meta').reasons
    if (hasReason(/^mention/, reasons)) {
      return this.sendPostPush('mention')
    } else if (hasReason(/^commentMention/, reasons)) {
      return this.sendCommentPush('mention')
    } else if (hasReason(/^newComment/, reasons)) {
      return this.sendCommentPush()
    } else if (hasReason(/^tag/, reasons)) {
      return Promise.resolve()
    } else if (hasReason(/^newPost/, reasons)) {
      return this.sendPostPush()
    } else {
      return Promise.resolve()
    }
  },

  sendPostPush: function (version) {
    var post = this.relations.activity.relations.post
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) return Promise.resolve()
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(post, community)).path
      var alertText = PushNotification.textForPost(post, community, this.relations.activity.get('reader_id'), version)
      return this.relations.activity.relations.reader.sendPushNotification(alertText, path)
    })
  },

  sendCommentPush: function (version) {
    var comment = this.relations.activity.relations.comment
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) return Promise.resolve()
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(comment.relations.post, community)).path
      var alertText = PushNotification.textForComment(comment, version, this.relations.activity.get('reader_id'))
      return this.relations.activity.relations.reader.sendPushNotification(alertText, path)
    })
  },

  sendEmail: function () {
    var reasons = this.relations.activity.get('meta').reasons
    if (hasReason(/^mention/, reasons)) {
      return this.sendPostMentionEmail()
    } else if (hasReason(/^commentMention/, reasons)) {
      return this.sendCommentNotificationEmail('mention')
    } else if (hasReason(/^newComment/, reasons)) {
      return this.sendCommentNotificationEmail()
    }
  },

  sendPostMentionEmail: function () {
    var post = this.relations.activity.relations.post
    var reader = this.relations.activity.relations.reader
    var user = post.relations.user
    var description = RichText.qualifyLinks(post.get('description'))
    var replyTo = Email.postReplyAddress(post.id, reader.id)

    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) return Promise.resolve()
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
            user.get('avatar_url') + '?ctt=post_mention_email'),
          post_user_profile_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.profile(user) + '?ctt=post_mention_email'),
          post_description: description,
          post_title: post.get('name'),
          post_type: post.get('type'),
          post_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post) + '?ctt=post_mention_email'),
          unfollow_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.unfollow(post, community) + '?ctt=post_mention_email'),
          tracking_pixel_url: Analytics.pixelUrl('Mention in Post', {userId: reader.id})
        }
      })))
  },

  sendCommentNotificationEmail: function (version) {
  // opts.version corresponds to names of versions in SendWithUs

    var comment = this.relations.activity.relations.comment
    var reader = this.relations.activity.relations.reader
    if (!comment) return

    var post = comment.relations.post
    var commenter = comment.relations.user
    var poster = post.relations.user
    var text = RichText.qualifyLinks(comment.get('text'))
    var replyTo = Email.postReplyAddress(post.id, reader.id)

    var postLabel

    if (post.get('type') === 'welcome') {
      var relatedUser = post.relations.relatedUsers.first()
      if (relatedUser.id === reader.id) {
        postLabel = 'your welcoming post'
      } else {
        postLabel = format("%s's welcoming post", relatedUser.get('name'))
      }
    } else {
      postLabel = format('%s %s: "%s"',
        (reader.id === poster.id ? 'your' : 'the'), post.get('type'), post.get('name'))
    }

    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) return Promise.resolve()
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
            Frontend.Route.profile(commenter) + '?ctt=comment_email'),
          comment_text: text,
          post_label: postLabel,
          post_title: post.get('name'),
          comment_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.post(post) + '?ctt=comment_email' + `#comment-${comment.id}`),
          unfollow_url: Frontend.Route.tokenLogin(reader, token,
            Frontend.Route.unfollow(post, community)),
          tracking_pixel_url: Analytics.pixelUrl('Comment', {userId: reader.id})
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
    FollowAdd: 'followAdd', // you are added as a follower
    Follow: 'follow', // someone follows your post
    Unfollow: 'unfollow', // someone leaves your post
    Welcome: 'welcome' // a welcome post
  },

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    return Notification.where({id: id}).fetch(options)
  },

  findUnsent: function (options) {
    return Notification.query(q => {
      q.where({sent_at: null})
      q.where('notifications.medium', '!=', Notification.MEDIUM.InApp)
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
      'activity.comment.post.communities',
      'activity.community',
      'activity.reader',
      'activity.actor'
    ]})
    .then(notifications => notifications.map(notification => notification.send()))
  },

  priorityReason: function (reasons) {
    if (hasReason(/^mention/, reasons)) {
      return 'mention'
    } else if (hasReason(/^commentMention/, reasons)) {
      return 'commentMention'
    } else if (hasReason(/^newComment/, reasons)) {
      return 'newComment'
    } else if (hasReason(/^tag/, reasons)) {
      return 'tag'
    } else if (hasReason(/^newPost/, reasons)) {
      return 'newPost'
    } else {
      return ''
    }
  }

})
