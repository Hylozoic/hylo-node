module.exports = bookshelf.Model.extend({
  tableName: 'join_requests',
  requireFetch: false,
  hasTimestamps: true,

  user: function () {
    return this.belongsTo(User)
  },

  group: function () {
    return this.belongsTo(Group)
  }
}, {

  create: function (opts) {
    return new JoinRequest({
      group_id: opts.groupId,
      user_id: opts.userId,
      created_at: new Date(),
      status: 0,
    }).save()
    .tap(async request => {
      JoinRequest.afterCreate(request)
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

    JoinRequest.sendNotification(announcees)
  },

  sendNotification: function (activities = [], opts) {
    return Activity.saveForReasons(activities)
  },

  find: async function (id) {
    if (!id) return Promise.resolve(null)
    return JoinRequest.where({id}).fetch()
  },

  update: function (id, changes, moderatorId) {
    const { status } = changes;

    if (![0, 1, 2].includes(status)) {
      return Promise.reject(new Error('Status is invalid'))
    }

    const attributes = {
      updated_at: new Date(),
      status
    }

    const isApproved = status === 1

    return JoinRequest.query().where({ id }).update(attributes)
      .then(() => JoinRequest.find(id))
      .tap(async request => {
        if (isApproved) {
          await request.load(['group', 'user'])
          const { group, user } = request.relations;

          const approvedMember = {
            actor_id: moderatorId,
            reader_id: user.id,
            group_id: group.id,
            reason: 'approvedJoinRequest'
          }

          JoinRequest.sendNotification([approvedMember])
        }
      })
  }

})
