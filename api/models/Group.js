import { difference, isEqual } from 'lodash'

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

  memberships () {
    return this.hasMany(GroupMembership)
  },

  // if a group membership doesn't exist for a user id, create it.
  // make sure the group memberships have the passed-in role and settings
  // (merge on top of existing settings).
  async addMembers (userIds, { role, settings }, { transacting } = {}) {
    const existingMemberships = await this.memberships()
    .query(q => q.where('user_id', 'in', userIds)).fetch()

    for (let ms of existingMemberships.models) {
      const updatedColumns = {
        role,
        settings: Object.assign({}, ms.get('settings'), settings)
      }
      if (!isEqual(updatedColumns, ms.pick('role', 'settings'))) {
        await ms.save(updatedColumns, {patch: true, transacting})
      }
    }

    const newUserIds = difference(userIds, existingMemberships.pluck('id'))
    for (let id of newUserIds) {
      await this.memberships().create({user_id: id, role, settings}, {transacting})
    }
  },

  removeMember () {
    // TODO
  },

  updateMembership (userId, { active, role, settings }) {
    // TODO
  },

  updateGroupConnection () {

  },

  addChildGroup () {
    // TODO
  },

  removeChildGroup () {
    // TODO
  },

  joinParentGroup () {
    // TODO
  },

  leaveParentGroup () {
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

  find (instanceOrId, { transacting } = {}) {
    if (!instanceOrId) return null

    if (typeof instanceOrId === 'string' || typeof instanceOrId === 'number') {
      return this.where('id', instanceOrId).fetch({transacting})
    }

    return this.where({
      group_data_id: instanceOrId.id,
      group_data_type: this.getDataTypeForInstance(instanceOrId)
    }).fetch({transacting})
  }
})
