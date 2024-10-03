const { GraphQLYogaError } = require('@graphql-yoga/node')
import EnsureLoad from './mixins/EnsureLoad'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_relationship_invites',
  requireFetch: false,
  hasTimestamps: true,

  /*** Relationships ***/
  createdBy: function () {
    return this.belongsTo(User, 'created_by_id')
  },

  fromGroup: function () {
    return this.belongsTo(Group, 'from_group_id')
  },

  processedBy: function () {
    return this.belongsTo(User, 'processed_by_id')
  },

  questionAnswers: function () {
    return this.hasMany(GroupToGroupJoinRequestQuestionAnswer, 'join_request_id')
  },

  toGroup: function () {
    return this.belongsTo(Group, 'to_group_id')
  },

  /*** Getters ***/
  isCanceled: function () {
    return !!this.get('canceled_by_id')
  },

  isProcessed: function () {
    return !!this.get('processed_by_id')
  },

  /*** Setters/Mutators ***/

  // TODO: ? this should always return the GroupRelationship, regardless of whether the
  // invitation is unused or whether the GroupRelationship already exists
  accept: async function (userId, opts = {}) {
    return this.process(userId, GroupRelationshipInvite.STATUS.Accepted, opts)
  },

  cancel: async function (userId, { transacting } = {}) {
    if (this.isProcessed() || this.isCanceled()) return false

    const user = await User.find(userId, { transacting })
    const fromGroup = await this.fromGroup().fetch({ transacting })
    if (!GroupMembership.hasResponsibility(user, fromGroup, Responsibility.constants.RESP_ADMINISTRATION)) {
      throw new GraphQLYogaError('Not permitted to do this')
    }

    await this.save({ canceled_by_id: userId, canceled_at: new Date(), status: GroupRelationshipInvite.STATUS.Canceled },
      { patch: true, transacting })

    return true
  },

  reject: async function (userId, opts = {}) {
    return this.process(userId, GroupRelationshipInvite.STATUS.Rejected, opts)
  },

  process: async function (userId, status, { transacting } = {}) {
    if (this.isProcessed()) return false

    const user = await User.find(userId, { transacting })
    const toGroup = await this.toGroup().fetch({ transacting })
    if (!GroupMembership.hasResponsibility(user, toGroup, Responsibility.constants.RESP_ADMINISTRATION)) {
      // The person trying to process the invite does not have permission
      throw new GraphQLYogaError('Not permitted to do this')
    }
    const fromGroup = await this.fromGroup().fetch({ transacting })
    const parentGroup = (this.get('type') === GroupRelationshipInvite.TYPE.ParentToChild) ? fromGroup : toGroup
    const childGroup = (this.get('type') === GroupRelationshipInvite.TYPE.ParentToChild) ? toGroup : fromGroup

    await this.save({ processed_by_id: userId, processed_at: new Date(), status: status },
      { patch: true, transacting })

    if (status === GroupRelationshipInvite.STATUS.Accepted) {
      let relationship = await GroupRelationship.forPair(parentGroup, childGroup).fetch({ transacting })
      if (relationship) {
        // If an old relationship existed then just re-activate it
        await relationship.save({ active: true }, { transacting })
      } else {
        relationship = await parentGroup.addChild(childGroup, { transacting })
      }
      await Queue.classMethod('GroupRelationshipInvite', 'createAcceptNotifications', { inviteId: this.id, actorId: userId })

      return relationship
    }

    return true
  }

}, EnsureLoad), {

  STATUS: {
    Pending: 0,
    Accepted: 1,
    Rejected: 2,
    Canceled: 3
  },

  TYPE: {
    ParentToChild: 0,
    ChildToParent: 1
  },

  create: async function (attrs, opts) {
    const invite = await new GroupRelationshipInvite({
      created_at: new Date(),
      created_by_id: attrs.userId || attrs.createdById,
      from_group_id: attrs.fromGroupId,
      message: attrs.message,
      status: this.STATUS.Pending,
      subject: attrs.subject,
      to_group_id: attrs.toGroupId,
      type: attrs.type
    }).save({}, opts)

    await invite.load(['toGroup', 'createdBy', 'fromGroup'], opts)
    const { toGroup, createdBy, fromGroup } = invite.relations

    const moderators = await toGroup.moderators().fetch(opts)

    const notifications = moderators.map(moderator => ({
      actor_id: createdBy.id,
      reader_id: moderator.id,
      group_id: fromGroup.id,
      other_group_id: toGroup.id,
      reason: invite.get('type') === GroupRelationshipInvite.TYPE.ParentToChild ? Activity.Reason.GroupChildGroupInvite : Activity.Reason.GroupParentGroupJoinRequest
    }))

    await Activity.saveForReasons(notifications, opts.transacting)

    return invite
  },

  createAcceptNotifications: function({ inviteId, actorId }) {
    return GroupRelationshipInvite.find(inviteId).then(invite => invite &&
      bookshelf.transaction(async (transacting) => {
        await invite.load(['fromGroup', 'toGroup'], { transacting })
        const { fromGroup, toGroup } = invite.relations
        const parentToChild = invite.get('type') === GroupRelationshipInvite.TYPE.ParentToChild
        const childToParent = invite.get('type') === GroupRelationshipInvite.TYPE.ChildToParent

        // If child group is hidden then only tell administrators of the parent about it joining the parent, otherwise tell all the parent's members about it
        // TODO: RESP. check if this is what we want
        const fromMembers = (childToParent && fromGroup.isHidden()) ? await fromGroup.stewards().fetch({ transacting }) : await fromGroup.members().fetch({ transacting })
        const toMembers = (parentToChild && toGroup.isHidden()) ? await toGroup.stewards().fetch({ transacting }) : await toGroup.members().fetch({ transacting })

        // TODO: don't send a notification to the actorId...

        // TODO: fix hasRole
        const reason = parentToChild ? Activity.Reason.GroupChildGroupInviteAccepted : Activity.Reason.GroupParentGroupJoinRequestAccepted
        const fromGroupActivities = fromMembers.map(member => {
          return {
            reader_id: member.id,
            actor_id: actorId,
            group_id: fromGroup.id,
            other_group_id: toGroup.id,
            reason: `${reason}:${parentToChild ? 'parent' : 'child'}:${member.hasRole(GroupMembership.Role.MODERATOR) ? 'moderator' : 'member'}`
          }
        })
        const toGroupActivities = toMembers.map(member => {
          return {
            reader_id: member.id,
            actor_id: actorId,
            group_id: fromGroup.id,
            other_group_id: toGroup.id,
            reason: `${reason}:${parentToChild ? 'child' : 'parent'}:${member.hasRole(GroupMembership.Role.MODERATOR) ? 'moderator' : 'member'}`
          }
        })
        return Activity.saveForReasons(fromGroupActivities.concat(toGroupActivities), transacting)
      })
    )
  },

  find: async function (id) {
    if (!id) return Promise.resolve(null)
    return GroupRelationshipInvite.where({ id }).fetch()
  },

  forPair: function (fromGroup, toGroup) {
    const fromId = fromGroup instanceof Group ? fromGroup.id : fromGroup
    const toId = toGroup instanceof Group ? toGroup.id : toGroup
    if (!fromId || !toId) return null
    return GroupRelationshipInvite.where({ from_group_id: fromId, to_group_id: toId })
  },

  // TODO: need?
  resendAllReady () {
    return Invitation.query(q => {
      const whereClause = "((sent_count=1 and last_sent_at < now() - interval '4 day') or " +
        "(sent_count=2 and last_sent_at < now() - interval '9 day'))"
      q.whereRaw(whereClause)
      q.whereNull('used_by_id')
      q.whereNull('expired_by_id')
    })
    .fetchAll({withRelated: ['creator', 'group', 'tag']})
    .tap(invitations => Promise.map(invitations.models, i => i.send()))
    .then(invitations => invitations.pluck('id'))
  }

})
