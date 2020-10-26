module.exports = bookshelf.Model.extend({
  tableName: 'posts_tags',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }
})
