/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'groups_roles',
  requireFetch: false,

  group: function () {
    return this.belongsTo(Group)
  },
}, {

})
