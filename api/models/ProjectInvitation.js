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
      token: require('crypto').randomBytes(4).toString('hex'),
      created_at: new Date()
    };

    return new ProjectInvitation(attrs).save({}, _.pick(opts.transacting));
  },

  validate: function(projectId, token) {
    return this.where({
      project_id: projectId,
      token: token,
      accepted_at: null
    }).fetch().then(invitation => !!invitation);
  }

});