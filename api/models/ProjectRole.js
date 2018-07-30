module.exports = bookshelf.Model.extend({
  tableName: 'project_roles',

  project: function () {
    return this.belongsTo(Post)
  }
})
