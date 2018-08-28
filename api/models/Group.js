import { difference, intersection, sortBy } from 'lodash'
import DataType, {
  getDataTypeForInstance, getDataTypeForModel, getModelForDataType
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
    .query(q => q.where({
      'group_memberships.active': true,
      'users.active': true
    }))
  },

  memberships () {
    return this.hasMany(GroupMembership)
    .query(q => q.where('group_memberships.active', true))
  },

  // if a group membership doesn't exist for a user id, create it.
  // make sure the group memberships have the passed-in role and settings
  // (merge on top of existing settings).
  async addMembers (usersOrIds, attrs = {}, { transacting } = {}) {
    const {
      role = GroupMembership.Role.DEFAULT,
      settings = {}
    } = attrs

    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)

    const existingMemberships = await this.memberships()
    .query(q => q.where('user_id', 'in', userIds)).fetch()

    const changes = []

    for (let ms of existingMemberships.models) {
      changes.push(ms.updateAndSave({role, settings}, {transacting}))
    }

    const newUserIds = difference(userIds, existingMemberships.pluck('user_id'))

    for (let id of newUserIds) {
      changes.push(this.memberships().create({
        user_id: id,
        role,
        settings,
        active: true,
        created_at: new Date(),
        group_data_type: this.get('group_data_type')
      }, {transacting}))
    }

    return Promise.all(changes)
  },

  async removeMembers (usersOrIds, { transacting } = {}) {
    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)
    return GroupMembership.query(q => {
      q.where('group_id', this.id)
      q.where('user_id', 'in', userIds)
    }).query().update({active: false}).transacting(transacting)
  },
  
}, {
  DataType,

  find (instanceOrId, { transacting } = {}) {
    if (!instanceOrId) return null

    if (typeof instanceOrId === 'string' || typeof instanceOrId === 'number') {
      return this.where('id', instanceOrId).fetch({transacting})
    }

    const type = getDataTypeForInstance(instanceOrId)
    return this.findByIdAndType(instanceOrId.id, type, { transacting })
  },

  findByIdAndType (id, typeOrModel, { transacting } = {}) {
    return this.whereIdAndType(id, typeOrModel).fetch({transacting})
  },

  whereIdAndType (id, typeOrModel) {

    const type = typeof typeOrModel === 'number'
      ? typeOrModel
      : getDataTypeForModel(typeOrModel)

    return this.where({group_data_type: type, group_data_id: id})
  },

  async deactivate (dataId, type, opts = {}) {
    const group = await Group.whereIdAndType(dataId, type).fetch()
    await group.save({active: false}, opts)
    return group.removeMembers(await group.members().fetch(), opts)
  },

  pluckIdsForMember (userOrId, typeOrModel, where) {
    return GroupMembership.forIds(userOrId, null, typeOrModel, {
      query: q => {
        if (where) q.where(where)
        q.join('groups', 'groups.id', 'group_memberships.group_id')
        q.where('groups.active', true)
      },
      multiple: true
    }).query().pluck('group_data_id')
  },

  havingExactMembers (userIds, typeOrModel) {
    const type = typeof typeOrModel === 'number'
      ? typeOrModel
      : getDataTypeForModel(typeOrModel)

    const { raw } = bookshelf.knex
    userIds = sortBy(userIds, Number)
    return this.query(q => {
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_memberships.active', true)
      q.groupBy('groups.id')
      q.having(raw(`array_agg(user_id order by user_id) = ?`, [userIds]))
      q.where('groups.group_data_type', type)
    })
  },

  async allHaveMember (groupDataIds, userOrId, typeOrModel) {
    const memberIds = await this.pluckIdsForMember(userOrId, typeOrModel)
    return difference(groupDataIds, memberIds).length === 0
  },

  async inSameGroup (userIds, typeOrModel) {
    const groupIds = await Promise.all(userIds.map(id =>
      this.pluckIdsForMember(id, typeOrModel)))
    return intersection(groupIds).length > 0
  }
})
