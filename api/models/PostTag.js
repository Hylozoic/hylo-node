module.exports = bookshelf.Model.extend({
  tableName: 'posts_tags',

  post: function () {
    return this.belongsTo(Post)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }
})
