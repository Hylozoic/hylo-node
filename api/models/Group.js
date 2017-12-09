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

  updateMembership (userId, { active, role, settings }) {
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
  DataType: {
    POST: 0,
    COMMUNITY: 1,
    NETWORK: 2,
    TOPIC: 3,
    COMMENT: 4,
    COMMUNITY_AND_TOPIC: 5
  },

  getDataTypeForTableName (tableName) {
    switch (tableName) {
      case 'posts': return this.DataType.POST
      case 'communities': return this.DataType.COMMUNITY
      case 'networks': return this.DataType.NETWORK
      case 'tags': return this.DataType.TOPIC
      case 'comments': return this.DataType.COMMENT
    }

    throw new Error(`unsupported table name: ${tableName}`)
  },

  getDataTypeForInstance (instance) {
    if (instance instanceof Post) return this.DataType.POST
    if (instance instanceof Community) return this.DataType.COMMUNITY
    if (instance instanceof Network) return this.DataType.NETWORK
    if (instance instanceof Tag) return this.DataType.TOPIC
    if (instance instanceof Comment) return this.DataType.COMMENT
  },

  find (instanceOrId) {
    if (!instanceOrId) return null

    if (typeof instanceOrId === 'string' || typeof instanceOrId === 'number') {
      return this.where('id', instanceOrId).fetch()
    }

    return this.where({
      group_data_id: instanceOrId.id,
      group_data_type: this.getDataTypeForInstance(instanceOrId)
    }).fetch()
  }
})
