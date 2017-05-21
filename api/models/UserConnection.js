/* eslint-disable camelcase */
module.exports = bookshelf.Model.extend({
  tableName: 'user_connections',

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  otherUser: function () {
    return this.belongsTo(User, 'other_user_id')
  }
}, {
  Type: {
    MESSAGE: 'message'
  },

  create: function (userId, otherUserId, type) {
    if (!this.Type.hasOwnProperty(type.toUpperCase())) {
      throw new Error('Invalid UserConnection type specified')
    }
    if (userId === otherUserId) {
      throw new Error('other_user_id cannot equal user_id')
    }
    return new UserConnection({
      user_id: userId,
      other_user_id: otherUserId,
      type,
      created_at: new Date(),
      updated_at: new Date()
    })
    .save(null, { returning: '*' })
  },

  createOrUpdate: function (userId, otherUserId, type) {
    return this.find(userId, otherUserId, type)
      .then(connection => {
        if (connection) return connection.save(
          { updated_at: new Date() },
          { returning: '*' }
        )
        return this.create(userId, otherUserId, type)
      })
  },

  find: function (user_id, other_user_id, type) {
    if (!user_id) throw new Error('Parameter user_id must be supplied.')
    return UserConnection.where({ user_id, other_user_id, type }).fetch()
  },

  isMessage: function () {
    return this.get('type') === Post.Type.MESSAGE
  }
})
