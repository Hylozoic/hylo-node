import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_relationships',
  requireFetch: false,

  parentGroup () {
    return this.belongsTo(Group, 'parent_group_id')
  },

  childGroup () {
    return this.belongsTo(Group, 'child_group_id')
  }

}, HasSettings), {

  forPair (parentGroup, childGroup) {
    const parentId = parentGroup instanceof Group ? parentGroup.id : parentGroup
    const childId = childGroup instanceof Group ? childGroup.id : childGroup
    if (!parentId || !childId) return null
    return GroupRelationship.where({ parent_group_id: parentId, child_group_id: childId, active: true })
  },
})
