module.exports = bookshelf.Model.extend({
  tableName: 'comment',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id");
  }

});
