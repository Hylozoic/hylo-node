import HasSettings from './mixins/HasSettings'
import { isEmpty } from 'lodash'
import {
  whereId
} from './group/queryUtils'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_memberships',
  requireFetch: false,
  hasTimestamps: true,

  agreements () {
    return this.belongsToMany(Agreement, 'users_groups_agreements', 'group_id', 'agreement_id', 'group_id')
      .through(UserGroupAgreement, 'group_id', 'agreement_id')
      .where({ user_id: this.get('user_id') })
      .withPivot(['accepted'])
  },

  group () {
    return this.belongsTo(Group)
  },

  user () {
    return this.belongsTo(User)
  },

  hasRole (role) {
    return Number(role) === this.get('role')
  },

  async acceptAgreements (transacting) {
    this.addSetting({ agreementsAcceptedAt: (new Date()).toISOString() })
    const groupId = this.get('group_id')
    const groupAgreements = await GroupAgreement.where({ group_id: groupId }).fetchAll({ transacting })
    for (const ga of groupAgreements) {
      const attrs = { group_id: groupId, user_id: this.get('user_id'), agreement_id: ga.get('agreement_id') }
      await UserGroupAgreement
        .where(attrs)
        .fetch({ transacting })
        .then(async (uga) => {
          if (uga && !uga.get('accepted')) {
            await uga.save({ accepted: true }, { transacting })
          } else {
            await UserGroupAgreement.forge(attrs).save({}, { transacting })
          }
        })
    }
  },

  async updateAndSave (attrs, { transacting } = {}) {
    for (const key in attrs) {
      if (key === 'settings') {
        this.addSetting(attrs[key])
      } else {
        this.set(key, attrs[key])
      }
    }

    if (!isEmpty(this.changed)) return this.save(null, {transacting})
    return this
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

  async hasModeratorRole (userOrId, groupOrId, opts) {
    const gm = await this.forPair(userOrId, groupOrId).fetch(opts)
    return gm && gm.hasRole(this.Role.MODERATOR)
  },

  async setModeratorRole (userId, group) {
    return group.addMembers([userId], { role: this.Role.MODERATOR })
  },

  async removeModeratorRole (userId, group) {
    return group.addMembers([userId], { role: this.Role.DEFAULT })
  },

  forMember (userOrId) {
    return this.forIds(userOrId, null, { multiple: true })
  },

  async updateLastViewedAt (userOrId, groupOrId) {
    const membership = await GroupMembership.forPair(userOrId, groupOrId).fetch()
    if (membership) {
      membership.addSetting({ lastReadAt: new Date() })
      await membership.save({ new_post_count: 0 })
      return membership
    }
    return false
  }
})
