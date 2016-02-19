module.exports = bookshelf.Model.extend({
  tableName: 'project_invitations',

  user: function () {
    return this.belongsTo(User)
  },

  project: function () {
    return this.belongsTo(Project)
  },

  use: function (userId, opts) {
    return Promise.join(
      this.save({user_id: userId, accepted_at: new Date}, _.pick(opts, 'transacting')),
      ProjectMembership.create(userId, this.get('project_id'), _.pick(opts, 'transacting'))
    )
  }

}, {
  create: function (projectId, opts) {
    var attrs = {
      project_id: projectId,
      user_id: opts.userId,
      email: opts.email,
      token: require('crypto').randomBytes(4).toString('hex'),
      created_at: new Date()
    }

    return new ProjectInvitation(attrs).save({}, _.pick(opts.transacting))
  },

  findByToken: function (token) {
    return this.where({token: token}).fetch()
  },

  validate: function (projectId, token) {
    return this.where({
      project_id: projectId,
      token: token,
      accepted_at: null
    }).fetch().then(invitation => !!invitation)
  },

  forUser: function (userId, projectId) {
    return ProjectInvitation.query(qb => {
      if (projectId) qb.where('project_id', projectId)
      qb.where(function () {
        this.where('user_id', userId)
        .orWhere('email', bookshelf.knex('users').select('email').where('id', userId))
      })
    })
  }

})
