module.exports = bookshelf.Model.extend({
  tableName: 'follower',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id").query({where: {active: true}})
  }

}, {
  getFollowers: function(postId) {
    return bookshelf.knex("follower").where({
      post_id: postId
    });
  },

  addFollower: function(postId, followerId, addedById) {
    return new Follower({
      post_id: postId,
      date_added: new Date(),
      user_id: followerId,
      added_by_id: addedById
    }).save();
  }
});
