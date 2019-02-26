export default {
  // note that this `where` argument is applied to the subquery;
  // to add clauses to the outer query, just use `.query` on the
  // result of this method
  queryByGroupMembership (model, { where } = {}) {
    let subq = this.groupMembershipsForModel(model)
    .query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .select('group_data_id')

    if (where) subq = subq.where(where)

    return model.collection().query(q => q.where('id', 'in', subq))
  },

  groupMembershipsForModel (model) {
    return GroupMembership.forMember(this.id, model)
  }
}
