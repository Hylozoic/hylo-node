module.exports = bookshelf.Model.extend({
  tableName: 'join_requests',

  user: function () {
    return this.belongsTo(User)
  },

  community: function () {
    return this.belongsTo(Community)
  }
}, {

})
