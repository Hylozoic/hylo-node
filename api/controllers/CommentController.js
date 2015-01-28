var Promise = require('bluebird');

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

var createComment = function(userId, text, post) {
  var text = RichText.sanitize(text),
    mentions = RichText.getUserMentions(text),
    attrs = {
      comment_text: text,
      date_commented: new Date(),
      post_id: post.id,
      user_id: userId,
      active: true
    };

  return bookshelf.transaction(function(trx) {
    return new Comment(attrs).save(null, {transacting: trx})
    .tap(function(comment) {

      return Promise.join(
        // add followers
        Promise.map(mentions, function(mentionedUserId) {
          return Follower.create(post.id, {
            followerId: mentionedUserId,
            addedById: userId,
            transacting: trx
          });
        }),

        // create notification
        Notification.createForComment(post.id, comment.id, userId, {transacting: trx}),

        // update number of comments on post
        Aggregate.count(post.comments(), {transacting: trx})
        .then(function(numComments) {
          return post.save({
            num_comments: numComments,
            last_updated: new Date()
          }, {patch: true, transacting: trx});
        })
      );

    }); // tap
  }); // transaction

};

module.exports = {

  create: function(req, res) {
    createComment(req.session.userId, req.param('text'), res.locals.post)
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
  }

}