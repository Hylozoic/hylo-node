import HasSettings from './mixins/HasSettings'
import { isEmpty } from 'lodash'
import {
  isFollowing,
  queryForMember,
  whereId,
  whereUserId
} from './group/queryUtils'
import {
  getDataTypeForModel,
  getModelForDataType
} from './group/DataType'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_memberships',
  requireFetch: false,

  group () {
    return this.belongsTo(Group)
  },

  user () {
    return this.belongsTo(User)
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

  forPair (userOrId, group, opts = {}) {
    const userId = userOrId instanceof User ? userOrId.id : userOrId
    if (!userId) {
      throw new Error("Can't call forPair without a user or user id")
    }
    if (!group) {
      throw new Error("Can't call forPair without an instance")
    }

    // TODO: remove hack for group data type here
    return this.forIds(userId, group.id, opts)
  },

  // `usersOrIds` can be a single user or id, a list of either, or null
  forIds (usersOrIds, groupId, opts = {}) {
    const queryRoot = opts.multiple ? this.collection() : this
    return queryRoot.query(q => {
      if (groupId) {
        q.join('groups', 'groups.id', 'group_memberships.group_id')
        whereId(q, groupId, 'groups.id')
      }

      if (usersOrIds) {
        whereUserId(q, usersOrIds)
      }

      if (!opts.includeInactive) q.where('group_memberships.active', true)
      if (opts.query) opts.query(q)
    })
  },

  async hasActiveMembership (userOrId, group) {
    const gm = await this.forPair(userOrId, group).fetch()
    return !!gm && gm.get('active')
  },

  async hasModeratorRole (userOrId, group) {
    const gm = await this.forPair(userOrId, group).fetch()
    return gm && gm.hasRole(this.Role.MODERATOR)
  },

  async setModeratorRole (userId, group) {
    return group.addMembers([userId], {role: this.Role.MODERATOR})
  },

  async removeModeratorRole (userId, group) {
    return group.addMembers([userId], {role: this.Role.DEFAULT})
  },

  // TODO: remove?
  forMember (userOrId) {
    return this.forIds(userOrId, null, {multiple: true})
  }
})
