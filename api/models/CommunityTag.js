module.exports = bookshelf.Model.extend({
  tableName: 'communities_tags',

  community: function () {
    return this.belongsTo(Community)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }

})
