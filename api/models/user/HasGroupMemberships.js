export default {
  queryByGroupMembership (model) {
    const dataType = Group.getDataTypeForTableName(model.forge().tableName)

    const subq = GroupMembership.query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .where({
      user_id: this.id,
      group_data_type: dataType,
      active: true
    })
    .select('group_data_id')

    return model.where('id', 'in', subq)
  },

  groupPosts () {
    return this.queryByGroupMembership(Post)
  },

  groupCommunities () {
    return this.queryByGroupMembership(Community)
  }
}
