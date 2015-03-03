var commentAttributes = function(comment, isThanked) {
  return {
    "id": Number(comment.get("id")),
    "isThanked": isThanked,
    "text": comment.get("comment_text"),
    "timestamp": comment.get("date_commented"),
    "user": {
      "id": Number(comment.related("user").get("id")),
      "name": comment.related("user").get("name"),
      "avatar": comment.related("user").get("avatar_url")
    }
  }
};

var createComment = function(commenterId, text, post) {
  var text = RichText.sanitize(text),
    attrs = {
      comment_text: text,
      date_commented: new Date(),
      post_id: post.id,
      user_id: commenterId,
      active: true
    };

  commenterId = parseInt(commenterId);

  return bookshelf.transaction(function(trx) {
    return new Comment(attrs).save(null, {transacting: trx})
    .tap(function(comment) {
      // update number of comments on post
      return Aggregate.count(post.comments(), {transacting: trx})
      .then(function(numComments) {
        return post.save({
          num_comments: numComments,
          last_updated: new Date()
        }, {patch: true, transacting: trx});
      });
    })
    .tap(function(comment) {

      return post.load('followers', {transacting: trx}).then(function(post) {
        // find all existing followers and all mentioned users
        // (there may be some users in both groups)
        return [
          post.relations.followers.map(function(f) { return parseInt(f.attributes.user_id) }),
          RichText.getUserMentions(text)
        ];

      }).spread(function(existing, mentioned) {

        return Promise.join(
          // send a mention notification to all mentioned users
          Promise.map(mentioned, function(userId) {
            return Comment.queueNotificationEmail(userId, comment.id, 'mention');
          }),

          // send a comment notification to all followers except the commenter and mentioned users
          Promise.map(_.difference(_.without(existing, commenterId), mentioned), function(userId) {
            return Comment.queueNotificationEmail(userId, comment.id, 'default');
          }),

          // add all mentioned users and the commenter as followers, if not already following
          post.addFollowers(_.difference(mentioned.concat(commenterId), existing), commenterId, trx)

        );
      });

    });
  }); // transaction

};

module.exports = {

  create: function(req, res) {
    return createComment(req.session.userId, req.param('text'), res.locals.post)
    .then(function(comment) {
      return comment.load([
        {user: function (qb) {
          qb.column("id", "name", "avatar_url");
        }}
      ]);
    })
    .then(function(comment) {
      res.ok(commentAttributes(comment, false));
    }).catch(function(err) {
      res.serverError(err);
    });
  },

  createFromEmail: function(req, res) {
    try {
      var replyData = Email.decodeSeedReplyAddress(req.param('To'));
    } catch(e) {
      return res.serverError(new Error('Invalid reply address: ' + req.param('To')));
    }

    return Post.find(replyData.seedId)
    .then(function(seed) {
      Analytics.track({
        userId: replyData.userId,
        event: 'Post: Comment: Add by Email',
        properties: {
          post_id: seed.id
        }
      });
      return createComment(replyData.userId, req.param('stripped-text'), seed);
    })
    .then(function() {
      res.ok({});
    })
    .catch(function(err) {
      res.serverError(err);
    });
  }

}