/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'groups_agreements',
  requireFetch: false,
  hasTimestamps: true,

  agreement: function () {
    return this.belongsTo(Agreement)
  },

  group: function () {
    return this.belongsTo(Group)
  }
}, {

})
