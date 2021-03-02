module.exports = bookshelf.Model.extend({
  tableName: 'user_external_data',
  requireFetch: false,
  hasTimestamps: true
}, {
  find: function (userId, type, opts) {
    return this.where({user_id: userId, type: type}).fetch(opts)
  },

  store: function (userId, type, data) {
    return this.find(userId, type).then(storage => {
      if (!storage) {
        storage = new UserExternalData({
          user_id: userId,
          type: type,
          created_at: new Date()
        })
      }

      storage.set({data: data, updated_at: new Date()})
      return storage.save()
    })
  }

})
