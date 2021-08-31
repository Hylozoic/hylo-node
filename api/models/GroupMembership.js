import HasSettings from './mixins/HasSettings'
import { isEmpty } from 'lodash'
import {
  whereId
} from './group/queryUtils'
import {
  getDataTypeForModel,
  getModelForDataType
} from './group/DataType'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_memberships',
  requireFetch: false,
  hasTimestamps: true,

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

  forPair (userOrId, groupOrId, opts = {}) {
    const userId = userOrId instanceof User ? userOrId.id : userOrId
    const groupId = groupOrId instanceof Group ? groupOrId.id : groupOrId

    if (!userId) {
      throw new Error("Can't call forPair without a user or user id")
    }
    if (!groupId) {
      throw new Error("Can't call forPair without a group or group id")
    }

    return this.forIds(userId, groupId, opts)
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
        whereId(q, usersOrIds, 'group_memberships.user_id')
      }

      if (!opts.includeInactive) q.where('group_memberships.active', true)
      if (opts.query) opts.query(q)
    })
  },

  async hasActiveMembership (userOrId, groupOrId) {
    const gm = await this.forPair(userOrId, groupOrId).fetch()
    return !!gm && gm.get('active')
  },

  async hasModeratorRole (userOrId, groupOrId) {
    const gm = await this.forPair(userOrId, groupOrId).fetch()
    return gm && gm.hasRole(this.Role.MODERATOR)
  },

  async setModeratorRole (userId, group) {
    return group.addMembers([userId], {role: this.Role.MODERATOR})
  },

  async removeModeratorRole (userId, group) {
    return group.addMembers([userId], {role: this.Role.DEFAULT})
  },

  forMember (userOrId) {
    return this.forIds(userOrId, null, {multiple: true})
  }
})
