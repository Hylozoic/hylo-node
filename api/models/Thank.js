module.exports = bookshelf.Model.extend({
  tableName: 'thank_you',

  comment: function() {
    return this.belongsTo(Post, 'comment_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id").query({where: {active: true}});
  }

});
