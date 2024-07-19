module.exports = bookshelf.Model.extend({
  tableName: 'comments_tags',
  requireFetch: false,
  hasTimestamps: true,

  comment: function () {
    return this.belongsTo(Comment)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }
})
