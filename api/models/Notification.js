var url = require('url')
import { isEmpty } from 'lodash'
module.exports = bookshelf.Model.extend({

  tableName: 'notifications',

  activity: function () {
    return this.belongsTo(Activity)
  },

  send: function () {
    switch (this.get('medium')) {
      case Notification.MEDIUM.Push:
        return this.sendPush()
      case Notification.MEDIUM.Email:
        return this.sendEmail()
    }
  },

  sendPush: function () {
    var reasons = this.relations.activity.get('meta').reasons
    if (reasons.some(reason => reason.match(/^mention/))) {
      return Promise.resolve()
    } else if (reasons.some(reason => reason.match(/^tag/))) {
      return Promise.resolve()
    } else {
      return this.sendNewPostPush()
    }
  },

  sendNewPostPush: function () {
    var post = this.relations.activity.relations.post
    var communityIds = Activity.communityIds(this.relations.activity)
    if (isEmpty(communityIds)) return Promise.resolve()
    return Community.find(communityIds[0])
    .then(community => {
      var path = url.parse(Frontend.Route.post(post, community)).path
      var alertText = PushNotification.textForNewPost(post, community, this.get('reader_id'))
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
    Notification.findUnsent({withRelated: [
      'activity',
      'activity.post',
      'activity.post.communities',
      'activity.post.user',
      'activity.comment',
      'activity.comment.post',
      'activity.comment.post.communities',
      'activity.community',
      'activity.reader',
      'activity.actor'
    ]})
    .then(notifications => notifications.map(notification => notification.send()))
  }
})
