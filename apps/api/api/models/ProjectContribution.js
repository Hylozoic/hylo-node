module.exports = bookshelf.Model.extend({
  tableName: 'project_contributions',
  requireFetch: false,
  hasTimestamps: true,

  user: function () {
    return this.belongsTo(User)
  },

  project: function () {
    return this.belongsTo(Post)
  }

}, {
})
