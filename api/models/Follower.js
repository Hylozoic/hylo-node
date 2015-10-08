module.exports = bookshelf.Model.extend({
  tableName: 'follower',

  post: function() {
    return this.belongsTo(Post);
  },

  user: function() {
    return this.belongsTo(User).query({where: {active: true}})
  }

}, {

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
