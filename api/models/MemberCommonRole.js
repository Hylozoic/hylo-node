/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'common_roles_group_memberships',
  requireFetch: false,

  group: function () {
    return this.belongsTo(Group, 'group_id')
  },

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  commonRole: function () {
    return this.belongsTo(CommonRole, 'common_role_id')
  },

  groupMembership () {
    return this.belongsTo(GroupMembership, 'group_membership_id')
  }
}, {
})
