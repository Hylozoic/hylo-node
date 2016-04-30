module.exports = bookshelf.Model.extend({

  tableName: 'notifications',

  activity: function () {
    return this.belongsToMany(Activity)
  }

}, {

  MEDIA: {
    InApp: 'in-app',
    Push: 'push',
    Email: 'email'
  },

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    return Notification.where({id: id}).fetch(options)
  }
})
