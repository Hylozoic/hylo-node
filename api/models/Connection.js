/* eslint-disable camelcase */
module.exports = bookshelf.Model.extend({
  tableName: 'user_connections',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  with: function () {
    return this.belongsTo(User, 'with_id')
  }
}, {
  Type: {
    MESSAGE: 'message'
  },

  create: function (userId, withId, type) {
    if (!this.Type.hasOwnProperty(type.toUpperCase())) {
      throw new Error('Invalid Connection type specified')
    }
    return new Connection({
      user_id: userId,
      with_id: withId,
      type,
      created_at: new Date(),
      updated_at: new Date()
    })
  },

  createOrUpdate: function (userId, withId, type) {
    return this.find(userId, withId, type)
      .then(connection => {
        if (connection) return connection.update({ updated_at: new Date() })
        return this.create(userId, withId, type)
      })
  },

  find: function (user_id, with_id, type) {
    if (!user_id) throw new Error('Parameter user_id must be supplied.')
    return Connection.where({ user_id, with_id, type }).fetch()
  },

  isMessage: function () {
    return this.get('type') === Post.Type.MESSAGE
  }
})
