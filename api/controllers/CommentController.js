var commentAttributes = function(comment) {
  var attrs = _.pick(comment.toJSON(), 'id', 'comment_text', 'created_at', 'user');
  return _.extend({
    isThanked: _.isEmpty(comment.relations.thanks)
  }, attrs);
};

var createComment = function(commenterId, text, post) {
  var text = RichText.sanitize(text),
    attrs = {
      comment_text: text,
      created_at: new Date(),
      post_id: post.id,
      user_id: commenterId,
      active: true
    };

  return bookshelf.transaction(function(trx) {
    return new Comment(attrs).save(null, {transacting: trx})
    .tap(() => post.updateCommentCount(trx));
  })
  .tap(comment => Queue.classMethod('Comment', 'sendNotifications', {commentId: comment.id}));

};

module.exports = {

  findForPost: function(req, res) {
    Comment.query(function(qb) {
      qb.where({post_id: res.locals.post.id, active: true});
      qb.orderBy('id', 'asc');
    }).fetchAll({withRelated: [
      {user: function(qb) {
        qb.column('id', 'name', 'avatar_url');
      }},
      {thanks: function(qb) {
        qb.where('thanked_by_id', req.session.userId);
      }}
    ]}).then(function(comments) {
      res.ok(comments.map(commentAttributes));
    })
    .catch(res.serverError.bind(res));
  },

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
      res.ok(commentAttributes(comment));
    }).catch(function(err) {
      res.serverError(err);
    });
  },

  createFromEmail: function(req, res) {
    try {
      var replyData = Email.decodePostReplyAddress(req.param('To'));
    } catch(e) {
      return res.serverError(new Error('Invalid reply address: ' + req.param('To')));
    }

    return Post.find(replyData.postId)
    .then(function(post) {
      Analytics.track({
        userId: replyData.userId,
        event: 'Post: Comment: Add by Email',
        properties: {
          post_id: post.id
        }
      });
      return createComment(replyData.userId, req.param('stripped-text'), post);
    })
    .then(function() {
      res.ok({});
    })
    .catch(function(err) {
      res.serverError(err);
    });
  },

  thank: function(req, res) {
    Comment.find(req.param('commentId'), {withRelated: [
      {thanks: function(qb) {
        qb.where('thanked_by_id', req.session.userId);
      }}
    ]}).then(function(comment) {
      var thank = comment.relations.thanks.first();
      if (thank) {
        return thank.destroy();
      } else {
        return Thank.create(comment, req.session.userId);
      }
    }).then(function() {
      res.ok({});
    }).catch(res.serverError.bind(res));
  },

  destroy: function(req, res) {
    Comment.find(req.param('commentId')).then(function(comment) {
      return bookshelf.transaction(function(trx) {

        return Promise.join(
          Activity.where('comment_id', comment.id).destroy({transacting: trx}),
          Post.query().where('id', comment.get('post_id')).decrement('num_comments', 1).transacting(trx),
          comment.save({
            deactivated_by_id: req.session.userId,
            deactivated_on: new Date(),
            active: false
          }, {patch: true})
        );

      });
    }).then(function() {
      res.ok({});
    }).catch(res.serverError.bind(res));
  }

};
