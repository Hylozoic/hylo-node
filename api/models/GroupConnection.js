import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_connections',

  parentGroup () {
    return this.belongsTo(Group, 'parent_group_id')
  },

  childGroup () {
    return this.belongsTo(Group, 'child_group_id')
  }

}, HasSettings), {

})
