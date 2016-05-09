var url = require('url')
import { isEmpty } from 'lodash'
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
    if (reasons.some(reason => reason.match(/^mention/))) {
      return this.sendPostPush('mention')
    } else if (reasons.some(reason => reason.match(/^commentMention/))) {
      return this.sendCommentPush('mention')
    } else if (reasons.some(reason => reason.match(/^newComment/))) {
      return this.sendCommentPush()
    } else if (reasons.some(reason => reason.match(/^tag/))) {
      return Promise.resolve()
    } else if (reasons.some(reason => reason.match(/^newPost/))) {
      return this.sendPostPush()
    }
  },

  sendPostPush: function (version) {
    var post = this.relations.activity.relations.post
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) return Promise.resolve()
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(post, community)).path
      var alertText = PushNotification.textForPost(post, community, this.get('reader_id'), version)
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
      var alertText = PushNotification.textForComment(comment, version, this.get('reader_id'))
      return this.relations.activity.relations.reader.sendPushNotification(alertText, path)
    })
  },

  sendEmail: function () {

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
      'activity.comment.post.communities',
      'activity.community',
      'activity.reader',
      'activity.actor'
    ]})
    .then(notifications => notifications.map(notification => notification.send()))
  }
})
