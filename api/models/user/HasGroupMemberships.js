import {
  getDataTypeForModel
} from '../group/DataType'

export default {
  // note that this `where` argument is applied to the subquery;
  // to add clauses to the outer query, just use `.query` on the
  // result of this method
  queryByGroupMembership (model, { where } = {}) {
    const type = getDataTypeForModel(model)

    let subq = this.groupMembershipsForModel(model)
    .query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .select(type === Group.DataType.POST ? 'group_data_id' : 'groups.id')

    if (where) subq = subq.where(where)
    const collection = type === Group.DataType.POST ? model.collection() : Group.collection()
    return collection.query(q => q.whereIn('id', subq))
  },

  groupMembershipsForModel (model) {
    return GroupMembership.forMember(this.id, model)
  }
}
