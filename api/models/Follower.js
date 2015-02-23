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

  create: function(postId, options) {
    // TODO add validation to make sure follower is a member of the community that the post belongs to.
    return new Follower({
      post_id: postId,
      date_added: new Date(),
      user_id: options.followerId,
      added_by_id: options.addedById
    }).save(null, _.pick(options, "transacting"));
  }

});
