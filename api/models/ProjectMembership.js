var ProjectMembership = module.exports = bookshelf.Model.extend({
  tableName: 'projects_users',

  project: function() {
    return this.belongsTo(Project);
  },

  user: function() {
    return this.belongsTo(User);
  },

  isModerator: function() {
    return this.get('role') === ProjectMembership.Role.MODERATOR;
  }

}, {

  Role: {
    DEFAULT: 0,
    MODERATOR: 1
  },

  find: function(userId, projectId, options) {
    return this.where({user_id: userId, project_id: projectId}).fetch(options);
  },

  create: function(userId, projectId, opts) {
    return new this({
      user_id: userId,
      project_id: projectId,
      created_at: new Date()
    }).save({}, _.pick(opts, 'transacting'))
    .catch(err => {
      if (err.message.includes('duplicate key value')) {
        return ProjectMembership.find(userId, projectId, opts);
      } else {
        throw err;
      }
    });
  }

});
