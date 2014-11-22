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
  }
})
