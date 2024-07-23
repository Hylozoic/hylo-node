module.exports = bookshelf.Model.extend({
  tableName: 'common_roles',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group, 'group_id')
  },

  // common_roles have a many-to-many relationship with responsibilities
  responsibilities: function () {
    return this.belongsToMany(Responsibility, 'common_roles_responsibilities', 'common_role_id', 'responsibility_id')
  },

  // common_roles have a many-to-many relationship with group_memberships
  groupMemberships: function () {
    return this.belongsToMany(GroupMembership, 'group_id', 'user_id').through(MemberCommonRole, 'common_role_id', 'group_id')
  }

}, {
  ROLES: {
    Coordinator: 1,
    Moderator: 2,
    Host: 3
  }
})
