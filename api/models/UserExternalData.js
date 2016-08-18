module.exports = bookshelf.Model.extend({
  tableName: 'user_external_data'

}, {
  find: function (userId, type, opts) {
    return this.where({user_id: userId, type: type}).fetch(opts)
  },

  findHitFinaccounts: function (type, opts) {
    // opts.limit = 100
    // var client = new Client()
    // return this.query(q => {
    //   q.where ({
    //     'type': type
    //   })
    //   q.limit ( 100 )
    // })
    return this.where({type: type}).fetchAll()
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
  },

  remove: function (userId) {
    return this.where({user_id: userId, type: 'hit-fin'}).destroy()
  },

})
