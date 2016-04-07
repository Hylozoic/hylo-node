module.exports = bookshelf.Model.extend({
  tableName: 'followed_tags',

  community: function () {
    return this.belongsTo(Community)
  },

  tag: function () {
    return this.belongsTo(Tag)
  },

  user: function () {
    return this.belongsTo(User)
  }

})
