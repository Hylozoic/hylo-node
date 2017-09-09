module.exports = bookshelf.Model.extend({
  tableName: 'networks_users',

  user: function () {
    return this.belongsTo(User)
  },

  network: function () {
    return this.belongsTo(Network)
  }
}, {
  DEFAULT_ROLE: 0,
  MODERATOR_ROLE: 1,

  addModerator: function (userId, networkId, opts = {}) {
    return new NetworkMembership({
      user_id: userId,
      network_id: networkId,
      created_at: new Date(),
      role: NetworkMembership.MODERATOR_ROLE
    }).save({}, opts)
  },

  hasModeratorRole: function (userId, networkId) {
    return NetworkMembership.where({
      user_id: userId,
      network_id: networkId,
      role: NetworkMembership.MODERATOR_ROLE
    }).count().then(count => Number(count) === 1)
  }
})
