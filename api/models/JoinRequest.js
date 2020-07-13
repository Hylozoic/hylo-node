module.exports = bookshelf.Model.extend({
  tableName: 'join_requests',

  user: function () {
    return this.belongsTo(User)
  },

  community: function () {
    return this.belongsTo(Community)
  }
}, {

  create: function (opts) {
    return new JoinRequest({
      community_id: opts.communityId,
      user_id: opts.userId,
      created_at: new Date(),
      status: 0,
    }).save()
  },

  find: async function (id) {
    if (!id) return Promise.resolve(null)
    return JoinRequest.where({id}).fetch()
  },

  update: function (id, changes) {
    const { status } = changes;

    if (![0, 1, 2].includes(status)) {
      return Promise.reject(new Error('Status is invalid'))
    }

    const attributes = {
      updated_at: new Date(),
      status: changes.status
    }

    return JoinRequest.query().where({ id }).update(attributes)
  }

})
