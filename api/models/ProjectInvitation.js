module.exports = bookshelf.Model.extend({
  tableName: 'project_invitations',

  user: function() {
    return this.belongsTo(User);
  },

  project: function() {
    return this.belongsTo(Project);
  }

}, {

  create: function(projectId, opts) {
    var attrs = {
      project_id: projectId,
      user_id: opts.userId,
      email: opts.email,
      created_at: new Date()
    };

    return new ProjectInvitation(attrs).save({}, _.pick(opts.transacting));
  }

});