module.exports = bookshelf.Model.extend({
  tableName: 'vote',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id")
  }

}, {

  /**
   * @param userId User ID to check which posts they voted on
   * @param postIds List of Post ID's to check against
   * @returns a list of Vote's.
   */
  forUserInPosts: function(userId, postIds) {
    return bookshelf.knex("vote").where({
      user_id: userId
    }).whereIn("post_id", postIds);
  }
});
