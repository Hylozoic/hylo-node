module.exports = bookshelf.Model.extend({
  tableName: 'groups',

  groupData () {
    return this.morphTo('group_data', Post, Community, Network)
  },

  childGroups () {
    return this.belongsToMany(Group).through(GroupConnection, 'parent_group_id', 'child_group_id')
  },

  parentGroups () {
    return this.belongsToMany(Group).through(GroupConnection, 'child_group_id', 'parent_group_id')
  },

  members () {
    return this.belongsToMany(User).through(GroupMembership)
  },

  addMember () {
    // TODO
  },

  removeMember () {
    // TODO
  },

  addChildGroup () {
    // TODO
  },

  removeChildGroup () {
    // TODO
  },

  joinGroup () {
    // TODO
  },

  leaveGroup () {
    // TODO
  }
}, {
  find (instanceOrId) {
    if (!instanceOrId) return null

    if (instanceOrId.tableName) {
      return this.where({
        group_data_type: instanceOrId.tableName,
        group_data_id: instanceOrId.id
      }).fetch()
    }

    return this.where('id', instanceOrId).fetch()
  }
})
