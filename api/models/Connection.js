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

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    return Connection.where({ id }).fetch(options)
  },

  isMessage: function () {
    return this.get('type') === Post.Type.MESSAGE
  }
})
