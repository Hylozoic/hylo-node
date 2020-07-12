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

  update: function (changes) {
    const attributes = {
      updated_at: new Date(),
      status: changes.status
    }
    this.set(attributes)
    return this.validate().then(() => this.save())
  },

  validate: function () {
    if (!['pending', 'accepted', 'rejected'].includes(this.get('status'))) {
      return Promise.reject(new Error('Status is invalid'))
    }

    return Promise.resolve()
  },

})
