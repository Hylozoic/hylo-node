export default {
  // note that this `where` argument is applied to the subquery;
  // to add clauses to the outer query, just use `.query` on the
  // result of this method
  queryByGroupMembership (model, { where } = {}) {
    const dataType = Group.getDataTypeForTableName(model.forge().tableName)

    let subq = GroupMembership.query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .where({
      user_id: this.id,
      group_data_type: dataType,
      'group_memberships.active': true
    })
    .select('group_data_id')

    if (where) subq = subq.where(where)

    return model.collection().query(q => q.where('id', 'in', subq))
  },

  communitiesNotImplementedYet () {
    return this.queryByGroupMembership(Community)
  }
}
