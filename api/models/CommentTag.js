module.exports = bookshelf.Model.extend({
  tableName: 'comments_tags',
  requireFetch: false,

  comment: function () {
    return this.belongsTo(Comment)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }
})
