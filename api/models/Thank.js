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
    return this.query().count()
    .where({
      'thank_you.user_id': user.id,
      'comment.active': true
    })
    .join('comment', function() {
      this.on('comment.id', '=', 'thank_you.comment_id')
    })
    .then(function(rows) {
      return rows[0].count;
    });
  },

  create: function(comment, userId) {
    return new Thank({
      thanked_by_id: userId,
      comment_id: comment.get('id'),
      user_id: comment.get('user_id'),
      date_thanked: new Date()
    }).save();
  }

});
