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
    Mention: 'mention',     // you are mentioned in a seed or comment
    Comment: 'comment',     // someone makes a comment on a seed you follow
    FollowAdd: 'followAdd', // you are added as a follower
    Follow: 'follow',       // someone follows your seed
    Unfollow: 'unfollow'    // someone leaves your seed
  },

  find: function(id) {
    return this.where({id: id}).fetch();
  },

  forComment: function(comment, userId, action) {
    if (!action) {
      if (_.contains(comment.mentions(), parseInt(userId)))
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
      created_at: comment.get('date_commented')
    });
  },

  forSeed: function(seed, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: seed.get('creator_id'),
      post_id: seed.id,
      action: this.Action.Mention,
      created_at: seed.get('creation_date')
    })
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

  forUnfollow: function(seed, unfollowerId) {
    return new Activity({
      reader_id: seed.get('creator_id'),
      actor_id: unfollowerId,
      post_id: seed.id,
      action: this.Action.Unfollow,
      created_at: new Date()
    });
  },

  unreadCountForUser: function(user) {
    return Activity.query().where({reader_id: user.id, unread: true}).count().then(function(rows) {
      return parseInt(rows[0].count);
    });
  },

  createAllForReader: function(userId, startTime, endTime) {
    // make sure userId is a string
    userId = '' + userId + '';

    var follows;

    return Follower.where({user_id: userId}).fetchAll().then(function(fetchedFollows) {
      follows = fetchedFollows;
      var postIds = follows.map(function(f) { return f.get('post_id') });

      return Comment.query(function(qb) {
        qb.whereIn('post_id', postIds);
        qb.whereRaw('date_commented between ? and ?', [startTime, endTime]);
      }).fetchAll({withRelated: [
        {'post.creator': function(qb) { qb.column('id') }}
      ]});

    }).then(function(comments) {

      return bookshelf.transaction(function(trx) {

        // create activity for comments on followed posts created in the time range.
        // this may be inexact, e.g. it may include a comment created at time T1
        // even if followership of that post didn't occur until time T2 : T2 > T1
        return Promise.map(comments.models, function(comment) {
          if (comment.get('user_id') === userId) return;

          return Activity.forComment(comment, userId).save({}, {transacting: trx}).then(function(activity) {
            return (activity.get('action') == 'mention' ? activity.get('post_id') : null);
          });

        }).then(function(mentionedPostIds) {

          // create activity for follows created in the time range,
          // except those that would be redundant with mentions above.
          Promise.map(follows.filter(function(f) {
            var createdTime = f.get('date_added'),
              addedByOther = f.get('user_id') != f.get('added_by_id'),
              notMentioned = !_.contains(mentionedPostIds, f.id);

            return createdTime >= startTime && createdTime < endTime && addedByOther && notMentioned;
          }), function(follow) {
            return Activity.forFollowAdd(follow, userId).save({}, {transacting: trx});
          })

        });

      });
    });

  },

  resetNewNotificationCounts: function() {
    return Activity.query()
    .where('unread', true)
    .count()
    .select('reader_id')
    .groupBy('reader_id')
    .then(function(rows) {
      return Promise.map(rows, function(row) {
        return User.query().where({id: row.reader_id}).update({new_notification_count: row.count});
      });
    });
  }

});