/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'groups_roles',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group)
  },

  responsibilities: function () {
    return this.belongsToMany(Responsibility, 'group_roles_responsibilities', 'group_role_id', 'responsibility_id')
  }
}, {

})
