module.exports = bookshelf.Model.extend({
  tableName: 'post',

  creator: function () {
    return this.belongsTo(User, "creator_id");
  },

  communities: function () {
    return this.belongsToMany(Community, 'post_community', 'post_id', 'community_id');
  },

  followers: function () {
    return this.hasMany(Follower, "post_id");
  },

  contributors: function () {
    return this.hasMany(Contribution, "post_id");
  },

  comments: function () {
    return this.hasMany(Comment, "post_id").query({where: {active: true}});
  }
},{

  countForUser: function(user) {
    return bookshelf.knex('post').count().where({creator_id: user.id}).then(function(rows) {
      return rows[0].count;
    });
  },

  find: function(id) {
    return Post.where({id: id}).fetch();
  }
});
