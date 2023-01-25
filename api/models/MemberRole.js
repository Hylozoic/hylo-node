/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'members_roles',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group)
  },

  user: function () {
    return this.belongsTo(User)
  },

  groupRole: function () {
    return this.belongsTo(GroupRole)
  },
}, {

})
