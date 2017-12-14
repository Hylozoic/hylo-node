export default {
  async createGroup () {
    return await this.group() || Group.forge({
      group_data_id: this.id,
      group_data_type: Group.getDataTypeForInstance(this),
      created_at: new Date()
    }).save()
  },

  async group (opts) {
    return Group.find(this, opts)
  },

  async addGroupMembers (...args) {
    const dbOpts = args[2]
    return this.group(dbOpts).then(group => group.addMembers(...args))
  },

  queryByGroupConnection (model, direction = 'parent') {
    // TODO we can infer the correct direction in most cases rather than
    // requiring it to be specified
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
      'g2.group_data_type': dataType,
      'gc.active': true
    })
    .select('g2.group_data_id')

    return model.where('id', 'in', subq)
  },

  groupMembers ({ where } = {}) {
    let subq = GroupMembership.query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .where({
      group_data_id: this.id,
      group_data_type: Group.getDataTypeForInstance(this),
      'group_memberships.active': true
    })
    .select('user_id')
    if (where) subq = subq.where(where)

    return User.collection().query(q => q.where('id', 'in', subq))
  }

  // proxy some instance methods of Group?
}
