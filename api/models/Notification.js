module.exports = bookshelf.Model.extend({

  tableName: 'notifications',

  activity: function () {
    return this.belongsToMany(Activity)
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
    Notification.findUnsent()
    .then(notifications => notifications.map(notification => notification.send()))
  }
})
