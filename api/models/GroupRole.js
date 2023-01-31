/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'groups_roles',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group)
  },
}, {

})
