module.exports = bookshelf.Model.extend({
  tableName: 'contributor',

  post: function() {
    return this.belongsTo(Post, 'post_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id").query({where: {active: true}});
  }

});