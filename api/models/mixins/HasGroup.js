export default {
  group () {
    return Group.find(this)
  },

  queryByGroupConnection (model, direction = 'parent') {
    const dataType = Group.getDataTypeForTableName(model.forge().tableName)
    const [ fromCol, toCol ] = direction === 'parent'
      ? ['child_group_id', 'parent_group_id']
      : ['parent_group_id', 'child_group_id']

    const subq = Group.query()
    .join('group_connections as gc', 'groups.id', `gc.${fromCol}`)
    .join('groups as g2', 'g2.id', `gc.${toCol}`)
    .where({
      'groups.group_data_id': this.id,
      'groups.group_data_type': Group.getDataTypeForInstance(this),
      'g2.group_data_type': dataType
    })
    .select('g2.group_data_id')

    return model.where('id', 'in', subq)
  },

  groupMembers () {
    const subq = GroupMembership.query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .where({
      group_data_id: this.id,
      group_data_type: Group.getDataTypeForInstance(this)
    })
    .select('user_id')

    return User.where('id', 'in', subq)
  }

  // proxy some instance methods of Group?
}
