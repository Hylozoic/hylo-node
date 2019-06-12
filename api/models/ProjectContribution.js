module.exports = bookshelf.Model.extend({
  tableName: 'project_contributions',

  user: function () {
    return this.belongsTo(User)
  },

  project: function () {
    return this.belongsTo(Post)
  }

}, {
})
