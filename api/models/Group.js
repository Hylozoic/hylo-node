import { difference, sortBy } from 'lodash'
import DataType, {
  getDataTypeForInstance, getModelForDataType
} from './group/DataType'

module.exports = bookshelf.Model.extend({
  tableName: 'groups',

  groupData () {
    // eslint-disable-next-line camelcase
    const { group_data_type, group_data_id } = this.attributes
    const model = getModelForDataType(group_data_type)
    return model.query(q => q.where('id', group_data_id))
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
  }
}, {
  DataType,

  find (instanceOrId, { transacting } = {}) {
    if (!instanceOrId) return null

    if (typeof instanceOrId === 'string' || typeof instanceOrId === 'number') {
      return this.where('id', instanceOrId).fetch({transacting})
    }

    const type = getDataTypeForInstance(instanceOrId)
    return this.findByTypeAndId(type, instanceOrId.id, { transacting })
  },

  findByTypeAndId (type, id, { transacting } = {}) {
    return this.whereTypeAndId(type, id).fetch({transacting})
  },

  whereTypeAndId (type, id) {
    return this.where({group_data_type: type, group_data_id: id})
  },

  queryIdsByMemberId (type, userId) {
    return this.query(q => {
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_data_type', type)
      q.where('user_id', userId)
    }).query().select('group_data_id')
  },

  havingExactMembers (userIds) {
    const { raw } = bookshelf.knex
    userIds = sortBy(userIds, Number)
    return this.query(q => {
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_memberships.active', true)
      q.groupBy('groups.id')
      q.having(raw(`array_agg(user_id order by user_id) = ?`, [userIds]))
    })
  }
})
