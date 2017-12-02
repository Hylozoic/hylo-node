import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_memberships',

  group () {
    return this.belongsTo(Group)
  },

  user () {
    return this.belongsTo(User)
  }

}, HasSettings), {
  create (groupId, userId, { role, settings }) {
    // TODO
  },

  update (groupId, userId, { role, settings }) {
    // TODO
  }
})
