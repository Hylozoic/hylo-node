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

module.exports = {

  create: function(req, res) {
    var params = _.pick(req.allParams(), ['text']),
      cleanText = RichText.sanitize(params.text),
      mentions = RichText.getUserMentions(cleanText);

    bookshelf.transaction(function(trx) {
      return new Comment({
        comment_text: cleanText,
        date_commented: new Date(),
        post_id: res.locals.post.id,
        user_id: req.session.userId,
        active: true
      }).save(null, {transacting: trx})
        .tap(function (comment) {
          // add followers to post of new comment
          return Promise.map(mentions, function (userId) {
            return Follower.addFollower(res.locals.post.id, {
              followerId: userId,
              addedById: req.session.userId,
              transacting: trx
            });
          });
        })
        .tap(function (comment) {
          return Notification.createCommentNotification(res.locals.post.id, comment.id, req.session.userId, {transacting: trx})
        })
        .tap(function (comment) {
          return Aggregate.count(res.locals.post.comments(), {transacting: trx}).then(function(numComments) {
            return res.locals.post.save({
              num_comments: numComments,
              last_updated: new Date()
            }, {patch: true, transacting: trx});
          });
        })
        .then(function(comment) {
          return Promise.props({
            comment: comment.load([
                {
                  "user": function (qb) {
                    qb.column("id", "name", "avatar_url");
                  }
                }
              ], {transacting: trx}),
            isThanked: false
          });
        });
    }).then(function (data) {
      res.ok(commentAttributes(data.comment, data.isThanked))
    }).catch(function (err) {
      res.serverError(err);
    });
  }

}