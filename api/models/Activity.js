module.exports = bookshelf.Model.extend({

  tableName: 'activity',

  actor: function() {
    return this.belongsTo(User, 'actor_id');
  },

  reader: function() {
    return this.belongsTo(User, 'reader_id');
  },

  comment: function() {
    return this.belongsTo(Comment);
  },

  post: function() {
    return this.belongsTo(Post);
  }

}, {

  Action: {
    Mention: 'mention',     // you are mentioned in a post or comment
    Comment: 'comment',     // someone makes a comment on a post you follow
    FollowAdd: 'followAdd', // you are added as a follower
    Follow: 'follow',       // someone follows your post
    Unfollow: 'unfollow'    // someone leaves your post
  },

  find: function(id) {
    return this.where({id: id}).fetch();
  },

  forComment: function(comment, userId, action) {
    if (!action) {
      if (_.includes(comment.mentions(), userId.toString()))
        action = this.Action.Mention;
      else
        action = this.Action.Comment;
    }

    return new Activity({
      reader_id: userId,
      actor_id: comment.get('user_id'),
      comment_id: comment.id,
      post_id: comment.get('post_id'),
      action: action,
      created_at: comment.get('created_at')
    });
  },

  forPost: function(post, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: post.get('user_id'),
      post_id: post.id,
      action: this.Action.Mention,
      created_at: post.get('created_at')
    });
  },

  forFollowAdd: function(follow, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: follow.get('added_by_id'),
      post_id: follow.get('post_id'),
      action: this.Action.FollowAdd,
      created_at: follow.get('date_added')
    });
  },

  forFollow: function(follow, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: follow.get('user_id'),
      post_id: follow.get('post_id'),
      action: this.Action.Follow,
      created_at: follow.get('date_added')
    });
  },

  forUnfollow: function(post, unfollowerId) {
    return new Activity({
      reader_id: post.get('user_id'),
      actor_id: unfollowerId,
      post_id: post.id,
      action: this.Action.Unfollow,
      created_at: new Date()
    });
  },

  unreadCountForUser: function(user) {
    return Activity.query().where({reader_id: user.id, unread: true}).count().then(function(rows) {
      return parseInt(rows[0].count);
    });
  }

});
