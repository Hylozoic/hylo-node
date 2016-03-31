module.exports = bookshelf.Model.extend({
  tableName: 'comments_tags',

  comment: function () {
    return this.belongsTo(Comment)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }
})
