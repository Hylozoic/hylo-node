/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'group_memberships_group_roles',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group)
  },

  user: function () {
    return this.belongsTo(User)
  },

  groupRole: function () {
    return this.belongsTo(GroupRole, 'group_role_id')
  },

  groupMembership () {
    return this.belongsTo(GroupMembership)
  }
}, {
})
