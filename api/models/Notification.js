module.exports = bookshelf.Model.extend({

  tableName: 'notifications',

  activity: function () {
    return this.belongsToMany(Activity)
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
  }
})
