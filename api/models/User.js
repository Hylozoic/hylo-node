// The lack of a single-column primary key on this table turns out to be a real drag,
// because Bookshelf requires one for many purposes, so we have to drop down closer
// to raw SQL to work around that.

module.exports = bookshelf.Model.extend({
  tableName: 'users',

  memberships: function() {
    return this.hasMany(Membership, 'users_id');
  },

  communities: function() {
    return this.belongsToMany(Community, 'users_community', 'users_id', 'community_id');
  },

  setModerator: function(community) {
    return Membership.where({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community)
    }).save({role: 1}, {patch: true});
  },

  joinCommunity: function(community) {
    return bookshelf.knex('users_community').insert({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community)
    });
  }

});