module.exports = bookshelf.Model.extend({
  tableName: 'post',

  creator: function() {
    return this.belongsTo(User, "creator_id");
  },

  communities: function() {
    return this.belongsToMany(Community, 'post_community', 'post_id', 'community_id');
  },

  followers: function() {
    return this.hasMany(Follower, "post_id");
  },

  contributors: function() {
    return this.hasMany(Contribution, "post_id");
  }

});
