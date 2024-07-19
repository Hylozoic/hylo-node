module.exports = bookshelf.Model.extend({
  tableName: 'project_roles',
  requireFetch: false,

  project: function () {
    return this.belongsTo(Post)
  }
}, {
  find: function (id, options) {
    return ProjectRole.where({id}).fetch(options)
  },

  MEMBER_ROLE_NAME: 'member'
})
