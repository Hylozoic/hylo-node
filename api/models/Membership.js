module.exports = bookshelf.Model.extend({
  tableName: 'users_community',

  user: function () {
    return this.belongsTo(User)
  },

  community: function () {
    return this.belongsTo(Community)
  },

  deactivator: function () {
    return this.belongsTo(User, 'deactivator_id')
  },

  hasModeratorRole: function () {
    return this.get('role') === Membership.MODERATOR_ROLE
  }

}, {
  DEFAULT_ROLE: 0,
  MODERATOR_ROLE: 1,

  find: function (user_id, community_id_or_slug, options) {
    var fetch = function (community_id) {
      return Membership.where({
        user_id: user_id,
        community_id: community_id,
        active: true
      }).fetch(options)
    }

    if (isNaN(Number(community_id_or_slug))) {
      return Community.find(community_id_or_slug)
      .then(function (community) {
        if (community) return fetch(community.id, options)
      })
    }

    return fetch(community_id_or_slug)
  },

  create: function (userId, communityId, opts) {
    if (!opts) opts = {}

    return new Membership({
      user_id: userId,
      community_id: communityId,
      created_at: new Date(),
      last_viewed_at: new Date(),
      active: true,
      role: opts.role || Membership.DEFAULT_ROLE
    })
    .save({}, {transacting: opts.transacting})
    .tap(() => Analytics.track({
      userId: userId,
      event: 'Joined community',
      properties: {id: communityId}
    }))
  },

  setModeratorRole: function (user_id, community_id) {
    return bookshelf.knex('users_community').where({
      user_id: user_id,
      community_id: community_id
    }).update({role: Membership.MODERATOR_ROLE})
  },

  removeModeratorRole: function (user_id, community_id) {
    return bookshelf.knex('users_community').where({
      user_id: user_id,
      community_id: community_id
    }).update({role: Membership.DEFAULT_ROLE})
  },

  hasModeratorRole: function (user_id, community_id) {
    return this.find(user_id, community_id).then(function (mship) {
      return mship && mship.hasModeratorRole()
    })
  },

  // do all of the users have at least one community in common?
  inSameCommunity: function (userIds) {
    userIds = _.uniq(userIds)
    return bookshelf.knex
    .select('community_id')
    .count('*')
    .from('users_community')
    .whereIn('user_id', userIds)
    .groupBy('community_id')
    .havingRaw('count(*) = ?', [userIds.length])
    .then(function (sharedMemberships) {
      // the number of rows is equal to the number
      // of communities the users have in common
      return sharedMemberships.length > 0
    })
  },

  inSameNetwork: function (userId, otherUserId) {
    return Network.idsForUser(userId)
    .then(ids => {
      if (_.isEmpty(ids)) return false

      return Network.idsForUser(otherUserId)
      .then(otherIds => !_.isEmpty(_.intersection(ids, otherIds)))
    })
  },

  activeCommunityIds: function (user_id) {
    return bookshelf.knex('users_community').select('community_id')
    .where({user_id: user_id, active: true})
    .pluck('community_id')
  },

  lastViewed: userId =>
    Membership.query(q => {
      q.where('user_id', userId)
      q.limit(1)
      q.orderBy('last_viewed_at', 'desc')
    })

})
