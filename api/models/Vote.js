module.exports = bookshelf.Model.extend({
  tableName: 'vote',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id")
  }

}, {
  userVotesWithin: function(userId, postIds) {
    return bookshelf.knex("vote").where({
      user_id: userId
    }).whereIn("post_id", postIds);
  }
})
