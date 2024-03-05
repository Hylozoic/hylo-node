/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'group_roles_responsibilities',
  requireFetch: false,

  groupRoles: function () {
    return this.belongsToMany(GroupRole)
  },
  responsibilities: function () {
    return this.belongsToMany(Responsibility)
  }
}, {

})