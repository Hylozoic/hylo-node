module.exports = bookshelf.Model.extend({
  tableName: 'join_requests',

  user: function () {
    return this.belongsTo(User)
  },

  community: function () {
    return this.belongsTo(Community)
  }
}, {

  create: function (opts) {
    return new JoinRequest({
      community_id: opts.communityId,
      user_id: opts.userId,
      created_at: new Date(),
      status: 0,
    }).save()
    .tap(async request => {
      JoinRequest.afterCreate(request)
    })
  },

  afterCreate: async function (request) {
    await request.load(['community', 'user'])
    const { community, user } = request.relations

    const moderators = await community.moderators().fetch()

    const announcees = moderators.map(moderator => ({
      actor_id: user.id,
      reader_id: moderator.id,
      community_id: community.id,
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
          await request.load(['community', 'user'])
          const { community, user } = request.relations;

          const approvedMember = {
            actor_id: moderatorId,
            reader_id: user.id,
            community_id: community.id,
            reason: 'approvedJoinRequest'
          }
  
          JoinRequest.sendNotification([approvedMember])
        }
      })
  }

})
