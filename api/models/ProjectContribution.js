module.exports = bookshelf.Model.extend({
  tableName: 'project_contributions',
  requireFetch: false,

  user: function () {
    return this.belongsTo(User)
  },

  project: function () {
    return this.belongsTo(Post)
  }

}, {
})
