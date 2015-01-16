module.exports = bookshelf.Model.extend({
  tableName: 'thank_you',

  comment: function() {
    return this.belongsTo(Comment, 'comment_id');
  },

  user: function() {
    return this.belongsTo(User, "user_id").query({where: {active: true}});
  },

  thankedBy: function() {
    return this.belongsTo(User, "thanked_by_id");
  }

}, {
  didUserThank: function(commentId, userId) {
    return bookshelf.knex("thank_you").where({
      comment_id: commentId,
      thanked_by_id: userId
    })
  },

  countForUser: function(user) {
    return bookshelf.knex('thank_you').count().where({user_id: user.id}).then(function(rows) {
      return rows[0].count;
    });
  }
});
