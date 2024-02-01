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

  commonRoles () {
    return this.belongsToMany(CommonRole, 'common_roles')
      .through(MemberCommonRole, 'group_membership_id', 'common_role_id')
      .where({ user_id: this.get('user_id') })
      .withPivot(['group_id'])
  },

  commonRolesTotal () {
    return 1 // "Membership.commonRolesTotal defined in resolvers, but not in schema"
  },

  group () {
    return this.belongsTo(Group)
  },

  joinQuestionAnswers () {
    return this.hasMany(GroupJoinQuestionAnswer, 'group_id').where({ user_id: this.get('user_id') })
  },

  user () {
    return this.belongsTo(User)
  },

  hasRole (role) {
    // TODO RESP: change this to a lookup of responsibilities
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
    if (attrs.role === 0 || attrs.role === 1) {
      await MemberCommonRole.updateManagerRole({ groupMembershipId: this.get('id'), userId: this.get('user_id'), groupId: this.get('group_id'), role: attrs.role, transacting })
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

  async hasModeratorRole (userOrId, groupOrId, opts = {}, responsibility = '') { // TODO RESP: this could be simplified now we are ripping out
    // Currently this checks if the user is a moderator of the group, or if they have the responsibility passed in
    // Maybe it should be renamed to hasResponsibility, and just checks for the responsibility passed in...
    // but there are still uses where it only being used to check just the moderator role, so those will need to be accommodated in some fashion
    const userId = userOrId instanceof User ? userOrId.id : userOrId
    const groupId = groupOrId instanceof Group ? groupOrId.id : groupOrId
    if (!userId) {
      throw new Error("Can't call forPair without a user or user id")
    }
    if (!groupId) {
      throw new Error("Can't call forPair without a group or group id")
    }
    if (responsibility.length === 0) {
      throw new Error("Can't determine what responsibility is being checked")
    }

    const gm = await this.forPair(userOrId, groupId).fetch(opts)

    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)

    if (gm && !responsibilities.includes(responsibility)) {
      return false
    }
    return !!gm
  },

  async setModeratorRole (userId, group) { // TODO RESP: this needs to change to instead give the user the manager common role
    return group.addMembers([userId], { role: this.Role.MODERATOR })
  },

  async removeModeratorRole (userId, group) { // TODO RESP: this needs to change to instead remove the manager common role from the user
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
