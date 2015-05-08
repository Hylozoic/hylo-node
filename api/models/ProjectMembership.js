module.exports = bookshelf.Model.extend({
  tableName: 'projects_users',

  user: function() {
    return this.belongsTo(User);
  },

  project: function() {
    return this.belongsTo(Project);
  }

}, {

  find: function(userId, projectId, options) {
    return this.where({user_id: userId, project_id: projectId}).fetch(options);
  }

});