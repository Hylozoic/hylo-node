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
  },

  comments: function() {
    return this.hasMany(Comment, "post_id").query({where: {active: true}});
  }

}, {
  find: function(id) {
    return Post.where({id: id}).fetch();
  }
});
