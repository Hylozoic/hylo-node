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

  isMessage: function () {
    return this.get('type') === Post.Type.MESSAGE
  }
})
