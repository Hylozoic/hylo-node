/* eslint-disable camelcase */
import { difference, every, intersection, isEmpty, map, uniq, merge } from 'lodash'
import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(merge({
  tableName: 'communities_users',
  requireFetch: false,

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
    return this.get('role') === this.constructor.MODERATOR_ROLE
  }
}, HasSettings), {
  DEFAULT_ROLE: 0,
  MODERATOR_ROLE: 1,

  find: function (user_id, community_id_or_slug, options) {
    if (!user_id || !community_id_or_slug) return Promise.resolve(null)

    var fetch = function (community_id) {
      var attrs = {user_id, community_id}
      if (!options || !options.includeInactive) attrs.active = true
      return this.where(attrs).fetch(options)
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

    return this.forge({
      user_id: userId,
      community_id: communityId,
      created_at: new Date(),
      settings: {send_email: true, send_push_notifications: true},
      last_viewed_at: new Date(),
      active: true,
      role: opts.role || this.DEFAULT_ROLE
    })
    .save({}, {transacting: opts.transacting})
    .tap(() => User.followDefaultTags(userId, communityId, opts.transacting))
    .tap(() => Community.find(communityId, {transacting: opts.transacting})
      .tap(community => community.save({
        num_members: community.get('num_members') + 1
      }, {patch: true, transacting: opts.transacting}))
      .then(community => Analytics.track({
        userId: userId,
        event: 'Joined community',
        properties: {id: communityId, slug: community.get('slug')}
      })))
  },

  setModeratorRole: function (user_id, community_id) {
    return bookshelf.knex('communities_users').where({
      user_id: user_id,
      community_id: community_id
    }).update({role: this.MODERATOR_ROLE})
  },

  removeModeratorRole: function (user_id, community_id) {
    return bookshelf.knex('communities_users').where({
      user_id: user_id,
      community_id: community_id
    }).update({role: this.DEFAULT_ROLE})
  },

  hasModeratorRole: function (user_id, community_id) {
    return this.find(user_id, community_id)
    .then(ms => ms && ms.hasModeratorRole())
  },

  updateLastViewedAt: function (user_id, community_id) {
    return bookshelf.knex('communities_users').where({
      user_id: user_id,
      community_id: community_id
    }).update({
      last_viewed_at: new Date(),
      new_post_count: 0
    })
  },

  // do all of the users have at least one community in common?
  inSameCommunity: function (userIds) {
    return this.sharedCommunityIds(userIds)
    .then(ids => ids.length > 0)
  },

  sharedCommunityIds: function (userIds) {
    userIds = uniq(userIds)
    return bookshelf.knex
    .select('community_id')
    .count('*')
    .from('communities_users')
    .whereIn('user_id', userIds)
    .groupBy('community_id')
    .havingRaw('count(*) = ?', [userIds.length])
    .then(rows => map(rows, 'community_id'))
  },

  inSameNetwork: function (userId, otherUserId) {
    return Network.idsForUser(userId)
    .then(ids => {
      if (isEmpty(ids)) return false

      return Network.idsForUser(otherUserId)
      .then(otherIds => !isEmpty(intersection(ids, otherIds)))
    })
  },

  activeCommunityIds: function (user_id, moderator) {
    if (!user_id) return Promise.resolve([])
    var query = {user_id: user_id, active: true}
    if (moderator) {
      query.role = this.MODERATOR_ROLE
    }
    return this.query()
    .where(query)
    .pluck('community_id')
  },

  lastViewed: userId =>
    Membership.query(q => {
      q.where('user_id', userId)
      q.limit(1)
      q.orderBy('last_viewed_at', 'desc')
    })

})
