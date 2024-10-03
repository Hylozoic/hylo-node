module.exports = bookshelf.Model.extend({
  tableName: 'zapier_triggers_groups',
  requireFetch: false,
  hasTimestamps: false,

  trigger: function () {
    return this.belongsTo(ZapierTrigger)
  },

  group: function () {
    return this.belongsTo(Group)
  }
})
