import { difference, sortBy } from 'lodash'

module.exports = bookshelf.Model.extend({
  tableName: 'groups',

  groupData () {
    return this.morphTo('group_data', Post, Community, Network)
  },

  childGroups () {
    return this.belongsToMany(Group)
    .through(GroupConnection, 'parent_group_id', 'child_group_id')
  },

  parentGroups () {
    return this.belongsToMany(Group)
    .through(GroupConnection, 'child_group_id', 'parent_group_id')
  },

  members () {
    return this.belongsToMany(User).through(GroupMembership)
  },

  memberships () {
    return this.hasMany(GroupMembership)
    .query(q => q.where('group_memberships.active', true))
  },

  // if a group membership doesn't exist for a user id, create it.
  // make sure the group memberships have the passed-in role and settings
  // (merge on top of existing settings).
  async addMembers (userIds, { role, settings }, { transacting } = {}) {
    const existingMemberships = await this.memberships()
    .query(q => q.where('user_id', 'in', userIds)).fetch()

    for (let ms of existingMemberships.models) {
      await ms.updateAndSave({role, settings}, {transacting})
    }

    const newUserIds = difference(userIds, existingMemberships.pluck('user_id'))
    for (let id of newUserIds) {
      await this.memberships().create({user_id: id, role, settings}, {transacting})
    }
  },

  removeMember () {
    // TODO
  },

  async updateMembership (userId, attributes) {
    const ms = await this.memberships().query(q => q.where('user_id', userId))
    .fetchOne()

    return ms.updateAndSave(attributes)
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

    const type = this.getDataTypeForInstance(instanceOrId)
    return this.findByTypeAndId(type, instanceOrId.id, { transacting })
  },

  findByTypeAndId (type, id, { transacting } = {}) {
    return this.queryByTypeAndId(type, id).fetch({transacting})
  },

  queryByTypeAndId (type, id) {
    return this.where({group_data_type: type, group_data_id: id})
  },

  queryIdsByMemberId (type, userId) {
    return this.query(q => {
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_data_type', type)
      q.where('user_id', userId)
    }).query().select('group_data_id')
  },

  havingExactMembers (userIds, filter) {
    const { raw } = bookshelf.knex
    userIds = sortBy(userIds, Number)
    return this.query(q => {
      if (filter) filter(q)
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_memberships.active', true)
      q.groupBy('groups.id')
      q.having(raw(`array_agg(user_id order by user_id) = ?`, [userIds]))
    })
  }
})
