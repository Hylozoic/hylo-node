var knex = bookshelf.knex

var networkIdsQuery = function (userId) {
  var communityIdsQuery = knex.select('community_id').from('users_community')
    .where({user_id: userId, active: true})

  return knex.select().distinct('network_id').from('community')
    .whereIn('id', communityIdsQuery).whereRaw('network_id is not null')
}

module.exports = bookshelf.Model.extend({
  tableName: 'networks',

  communities: function () {
    return this.hasMany(Community)
  }

}, {
  find: function (idOrSlug, options) {
    if (isNaN(Number(idOrSlug))) {
      return this.where({slug: idOrSlug}).fetch(options)
    }
    return this.where({id: idOrSlug}).fetch(options)
  },

  containsUser: function (networkId, userId) {
    return this.idsForUser(userId)
      .then(ids => _.contains(ids, networkId.toString()))
  },

  activeCommunityIds: function (userId, rawQuery) {
    var query = knex.select('id').from('community')
      .whereIn('network_id', networkIdsQuery(userId))

    if (rawQuery) return query
    return query.then(rows => _.pluck(rows, 'id'))
  },

  idsForUser: function (userId) {
    return networkIdsQuery(userId)
      .then(rows => _.pluck(rows, 'network_id'))
  }

})
