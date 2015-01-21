var Promise = require('bluebird');

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
  },

  media: function () {
    return this.hasMany(Media);
  },

  addFollowers: function(userIds, addingUserId, transaction) {
    var postId = this.id;
    return Promise.map(userIds, function(userId) {
      return Follower.create(postId, {
        followerId: userId,
        addedById: addingUserId,
        transacting: transaction
      });
    });
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
