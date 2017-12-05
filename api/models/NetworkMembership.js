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
  ADMIN_ROLE: 2,

  addModerator: function (userId, networkId, opts = {}) {
    return addMemberWithRole(userId, networkId, NetworkMembership.MODERATOR_ROLE, opts)
  },

  addAdmin: function (userId, networkId, opts = {}) {
    return addMemberWithRole(userId, networkId, NetworkMembership.ADMIN_ROLE, opts)
  },

  hasModeratorRole: function (userId, networkId) {
    return NetworkMembership.where({
      user_id: userId,
      network_id: networkId
    }).fetch()
    .then(membership => {
      return !!membership && (membership.get('role') === NetworkMembership.MODERATOR_ROLE ||
        membership.get('role') === NetworkMembership.ADMIN_ROLE)
    })
  },

  hasAdminRole: function (userId, networkId) {
    return NetworkMembership.where({
      user_id: userId,
      network_id: networkId
    }).fetch()
    .then(membership => {
      return !!membership && membership.get('role') === NetworkMembership.ADMIN_ROLE
    })
  }
})

export function addMemberWithRole (userId, networkId, role, opts = {}) {
  return new NetworkMembership({
    user_id: userId,
    network_id: networkId,
    created_at: new Date(),
    role
  }).save({}, opts)
}
