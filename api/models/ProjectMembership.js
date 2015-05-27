module.exports = bookshelf.Model.extend({
  tableName: 'projects_users',

  project: function() {
    return this.belongsTo(Project);
  },

  user: function() {
    return this.belongsTo(User);
  }

}, {

  find: function(userId, projectId, options) {
    return this.where({user_id: userId, project_id: projectId}).fetch(options);
  },

  create: function(userId, projectId) {
    return new this({user_id: userId, project_id: projectId}).save();
  }

});