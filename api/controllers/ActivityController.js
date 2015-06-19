module.exports = {

  find: function(req, res) {
    Activity.query(function(qb) {
      qb.where('reader_id', req.session.userId);
      qb.limit(req.param('limit') || 10);
      qb.orderBy('created_at', 'desc');

      qb.whereRaw('(comment.active = true or comment.id is null)')
      .leftJoin('comment', function() {
        this.on('comment.id', '=', 'activity.comment_id')
      });

      qb.whereRaw('(post.active = true or post.id is null)')
      .leftJoin('post', function() {
        this.on('post.id', '=', 'activity.post_id')
      });

    }).fetchAll({withRelated: [
      {actor: function(qb) {
        qb.column('id', 'name', 'avatar_url');
      }},
      {comment: function(qb) {
        qb.column('id', 'comment_text', 'created_at');
      }},
      {'comment.thanks': function(qb) {
        qb.where('thanked_by_id', req.session.userId);
      }},
      {post: function(qb) {
        qb.column('id', 'name', 'creator_id', 'type', 'description');
      }},
      {'post.communities': function(qb) {
        qb.column('id', 'slug');
      }}
    ]})
    .then(function(activities) {
      res.ok(activities);
    })
    .catch(res.serverError.bind(res));
  },

  markAllRead: function(req, res) {
    Activity.query().where({reader_id: req.session.userId}).update({unread: false})
      .then(function() {
        res.ok({});
      })
      .catch(res.serverError.bind(res));
  },

  update: function(req, res) {
    Activity.find(req.param('activityId')).then(function(activity) {
      activity.attributes = _.pick(req.allParams(), 'unread');
      return activity.save();
    })
    .then(function() {
      res.ok({});
    })
    .catch(res.serverError.bind(res));
  }

};
