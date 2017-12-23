import HasSettings from './mixins/HasSettings'
import { castArray, isEmpty } from 'lodash'
import { isFollowing, queryForMember } from './group/queryUtils'
import {
  getDataTypeForModel,
  getModelForDataType
} from './group/DataType'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_memberships',

  group () {
    return this.belongsTo(Group)
  },

  user () {
    return this.belongsTo(User)
  },

  groupData () {
    // This is the main reason for the denormalizing of group_data_type from
    // groups onto group_memberships so far; if we're looking up the object for
    // a given membership, we need to know what model to use.
    //
    // It remains to be seen whether this is a good enough need to justify the
    // duplication of data. All the uses of this method so far are in contexts
    // where we could pass the correct model in as an argument.

    const model = getModelForDataType(this.get('group_data_type'))
    const { tableName } = model.forge()
    return model.query(q => {
      q.join('groups', `${tableName}.id`, 'groups.group_data_id')
      q.where('groups.id', this.get('group_id'))
    })
  },

  async updateAndSave (attrs, { transacting } = {}) {
    for (let key in attrs) {
      if (key === 'settings') {
        this.addSetting(attrs[key])
      } else {
        this.set(key, attrs[key])
      }
    }

    if (!isEmpty(this.changed)) return this.save(null, {transacting})
    return this
  },

  hasRole (role) {
    return Number(role) === this.get('role')
  }

}, HasSettings), {
  Role: {
    DEFAULT: 0,
    MODERATOR: 1
  },

  whereUnread (userId, model, { afterTime } = {}) {
    return this.query(q => {
      q.join('groups', 'groups.id', 'group_memberships.group_id')
      if (afterTime) q.where('groups.updated_at', '>', afterTime)
      queryForMember(q, userId, model)
      isFollowing(q)

      q.where(q2 => {
        q2.whereRaw("(group_memberships.settings->>'lastReadAt') is null")
        .orWhereRaw(`(group_memberships.settings->>'lastReadAt')
          ::timestamp without time zone at time zone 'utc'
          < groups.updated_at`)
      })
    })
  },

  forPair (userOrId, instance, opts = {}) {
    const userId = userOrId instanceof User ? userOrId.id : userOrId
    if (!userId) {
      throw new Error("Can't call forPair without a user or user id")
    }
    if (!instance) {
      throw new Error("Can't call forPair without an instance")
    }

    return this.forIds(userId, instance.id, instance.constructor, opts)
  },

  // `usersOrIds` can be a single user or id, a list of either, or null
  forIds (usersOrIds, instanceId, typeOrModel, opts = {}) {
    const userIds = usersOrIds
      ? castArray(usersOrIds).map(x => x instanceof User ? x.id : x)
      : null
    const type = typeof typeOrModel === 'number'
      ? typeOrModel
      : getDataTypeForModel(typeOrModel)

    const queryRoot = opts.multiple ? this.collection() : this

    return queryRoot.query(q => {
      q.where('group_memberships.group_data_type', type)

      // note that if userId or instanceId is null, the clause for it is
      // omitted. this is occasionally useful, e.g. for Network.memberCount()

      if (instanceId) {
        q.join('groups', 'groups.id', 'group_memberships.group_id')
        if (Array.isArray(instanceId)) {
          q.whereIn('group_data_id', instanceId)
        } else {
          q.where('group_data_id', instanceId)
        }
      }

      if (userIds) {
        if (userIds.length === 1) {
          q.where('group_memberships.user_id', userIds[0])
        } else {
          q.whereIn('group_memberships.user_id', userIds)
        }
      }

      if (!opts.includeInactive) {
        q.where('group_memberships.active', true)
      }

      if (opts.query) opts.query(q)
    })
  },

  async hasModeratorRole (userOrId, instance) {
    const gm = await this.forPair(userOrId, instance).fetch()
    return gm && gm.hasRole(this.Role.MODERATOR)
  },

  async setModeratorRole (userId, instance) {
    return instance.addGroupMembers([userId], {role: this.Role.MODERATOR})
  },

  async removeModeratorRole (userId, instance) {
    return instance.addGroupMembers([userId], {role: this.Role.DEFAULT})
  },

  forMember (userOrId, model) {
    return this.forIds(userOrId, null, model, {multiple: true})
  }
})
