const { GraphQLYogaError } = require('@graphql-yoga/node')

module.exports = bookshelf.Model.extend({
  tableName: 'join_requests',
  requireFetch: false,
  hasTimestamps: true,

  user: function () {
    return this.belongsTo(User)
  },

  group: function () {
    return this.belongsTo(Group)
  },

  questionAnswers: function () {
    return this.hasMany(GroupJoinQuestionAnswer)
  },

  accept: async function (moderatorId) {
    const user = await this.user().fetch()
    const group = await this.group().fetch()
    if (user && group) {
      user.joinGroup(group)

      // TODO: add tracking of who did the approving in the join_request
      await this.save({ status: JoinRequest.STATUS.Accepted }).then(async request => {
        const approvedMember = {
          actor_id: moderatorId,
          reader_id: user.id,
          group_id: group.id,
          reason: 'approvedJoinRequest'
        }

        Activity.saveForReasons([approvedMember])
      })
      return this
    }
    throw new GraphQLYogaError("Invalid join request")
  }
}, {

  STATUS: {
    Pending: 0,
    Accepted: 1,
    Rejected: 2,
    Canceled: 3
  },

  create: function (opts) {
    return new JoinRequest({
      group_id: opts.groupId,
      user_id: opts.userId,
      created_at: new Date(),
      status: this.STATUS.Pending,
    }).save()
    .then(async request => {
      JoinRequest.afterCreate(request)
      return request
    })
  },

  afterCreate: async function (request) {
    await request.load(['group', 'user'])
    const { group, user } = request.relations

    const moderators = await group.moderators().fetch()

    const announcees = moderators.map(moderator => ({
      actor_id: user.id,
      reader_id: moderator.id,
      group_id: group.id,
      reason: 'joinRequest'
    }))

    Activity.saveForReasons(announcees)
  },

  find: async function (id) {
    if (!id) return Promise.resolve(null)
    return JoinRequest.where({id}).fetch()
  }
})
