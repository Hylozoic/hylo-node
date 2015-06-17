var knex = bookshelf.knex;

module.exports = bookshelf.Model.extend({
  tableName: 'networks',

  communities: () => this.hasMany(Community)

}, {

  find: function(idOrSlug, options) {
    if (isNaN(Number(idOrSlug))) {
      return this.where({slug: idOrSlug}).fetch(options);
    }
    return this.where({id: idOrSlug}).fetch(options);
  },

  containsAnyCommunity: function(networkId, communityIds) {
    return Community.query()
    .where('id', 'in', communityIds)
    .where('network_id', networkId)
    .count().then(rows => Number(rows[0].count) > 0);
  },

  containsUser: function(networkId, userId) {
    return Membership.activeCommunityIds(userId)
    .then(ids => Network.containsAnyCommunity(networkId, ids));
  },

  activeCommunityIds: function(userId, rawQuery) {
    var query = knex.select('id').from('community')
    .whereIn('network_id',
      knex.select('network_id').from('community')
      .whereIn('id',
        knex.select('community_id').from('users_community')
        .where({users_id: userId, active: true})));

    if (rawQuery) return query;
    return query.then(rows => _.pluck(rows, 'id'));
  },

  idsForUser: function(userId) {
    return knex.select('network_id').from('community')
    .whereIn('id',
      knex.select('id').from('users_community')
      .where('users_id', userId))
    .then(rows => _.pluck(rows, 'id'));
  }

});