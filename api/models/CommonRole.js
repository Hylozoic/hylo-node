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
    return this.belongsToMany(GroupMembership, 'common_roles_group_memberships', 'common_role_id', 'group_membership_id')
  }

}, {

})
