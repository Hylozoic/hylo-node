module.exports = bookshelf.Model.extend({
  tableName: 'notification',

  actor: function() {
    return this.belongsTo(User);
  },

  post: function() {
    return this.belongsTo(Post);
  },

  action: function() {
    return this.get('action');
  },

  timestamp: function() {
    return this.get('timestamp');
  }

}, {
  createCommentNotification: function(postId, commentId, actorUserId, options) {
    return new Notification({
      actor_id: actorUserId,
      timestamp: new Date(),
      processed: false,
      type: "C",
      comment_id: commentId,
      post_id: postId
    }).save(null, options);
  }
});
