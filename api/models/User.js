module.exports = bookshelf.Model.extend({
  tableName: 'users',

  memberships: function() {
    return this.hasMany(Membership, 'users_id');
  },

  communities: function() {
    return this.belongsToMany(Community, 'users_community', 'users_id', 'community_id');
  },

  setModerator: function(community, cb) {
    Membership.where({
      users_id: this.id,
      community_id: (typeof community === 'object' ? community.id : community)
    }).save({role: 1}, {patch: true}).then(cb);
  }

});