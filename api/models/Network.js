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
  }

});