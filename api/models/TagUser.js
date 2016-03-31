module.exports = bookshelf.Model.extend({
  tableName: 'tags_users',

  tag: function () {
    return this.belongsTo(Tag)
  },

  user: function () {
    return this.belongsTo(User)
  }

})
