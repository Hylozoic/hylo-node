import { includes } from 'lodash'

var knex = bookshelf.knex

var networkIdsQuery = function (userId) {
  var communityIdsQuery = knex.select('community_id').from('communities_users')
    .where({user_id: userId, active: true})

  return knex.select().distinct('network_id').from('communities')
    .whereIn('id', communityIdsQuery).whereRaw('network_id is not null')
}

module.exports = bookshelf.Model.extend({
  tableName: 'networks',

  communities: function () {
    return this.hasMany(Community).query({where: {'communities.active': true}})
  },

  moderators: function () {
    return this.belongsToMany(User, 'networks_users', 'network_id', 'user_id')
      .query({where: {role: Membership.MODERATOR_ROLE}})
  },

  members: function () {
    return User.collection().query(q => {
      q.distinct()
      q.where({'communities.network_id': this.id})
      q.join('communities_users', 'users.id', 'communities_users.user_id')
      q.join('communities', 'communities.id', 'communities_users.community_id')
    })
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostNetworkMembership)
    .query({where: {'posts.active': true}})
  }
}, {

  find: function (idOrSlug, options) {
    if (isNaN(Number(idOrSlug))) {
      return this.where({slug: idOrSlug}).fetch(options)
    }
    return this.where({id: idOrSlug}).fetch(options)
  },

  containsUser: function (networkId, userId) {
    if (!networkId || !userId) return Promise.resolve(false)
    return this.idsForUser(userId)
    .then(ids => includes(ids, networkId.toString()))
  },

  activeCommunityIds: function (userId, rawQuery) {
    var query = knex.select('id').from('communities')
    .whereIn('network_id', networkIdsQuery(userId))

    return rawQuery ? query : query.pluck('id')
  },

  idsForUser: function (userId) {
    return networkIdsQuery(userId).pluck('network_id')
  }

})
