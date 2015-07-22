module.exports = bookshelf.Model.extend({

  tableName: 'user_external_data'

}, {

  find: (userId, type, opts) =>
    this.where({user_id: userId, type: type}).fetch(opts),

  store: (userId, type, data) =>
    this.find(userId, type).then(storage => {
      if (!storage) {
        storage = new UserExternalData({
          user_id: userId,
          type: type,
          created_at: new Date()
        });
      }

      storage.set({data: data, updated_at: new Date()});
      return storage.save();
    })

});
