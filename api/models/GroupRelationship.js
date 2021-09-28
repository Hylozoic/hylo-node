import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_relationships',
  requireFetch: false,
  hasTimestamps: true,

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

  childIdsFor (groupIds) {
    const parentGroupIds = Array.isArray(groupIds) ? groupIds : [groupIds]
    return GroupRelationship.query().select('child_group_id').where('group_relationships.active', true).whereIn('parent_group_id', parentGroupIds)
  },

  parentIdsFor (groupIds) {
    const childGroupIds = Array.isArray(groupIds) ? groupIds : [groupIds]
    return GroupRelationship.query().select('parent_group_id').where('group_relationships.active', true).whereIn('child_group_id', childGroupIds)
  }
})
