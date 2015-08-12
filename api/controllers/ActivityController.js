module.exports = {

  find: function(req, res) {
    Activity.query(function(qb) {
      qb.where('reader_id', req.session.userId);
      qb.limit(req.param('limit') || 10);
      qb.orderBy('created_at', 'desc');

      qb.whereRaw('(comment.active = true or comment.id is null)')
      .leftJoin('comment', () => this.on('comment.id', '=', 'activity.comment_id'));

      qb.whereRaw('(post.active = true or post.id is null)')
      .leftJoin('post', () => this.on('post.id', '=', 'activity.post_id'));

    }).fetchAll({withRelated: [
      {actor: qb => qb.column('id', 'name', 'avatar_url')},
      {comment: qb => qb.column('id', 'comment_text', 'created_at')},
      {'comment.thanks': qb => qb.where('thanked_by_id', req.session.userId)},
      {post: qb => qb.column('id', 'name', 'creator_id', 'type', 'description')},
      {'post.communities': qb => qb.column('community.id', 'slug')},
      {'post.relatedUsers': qb => qb.column('users.id', 'name', 'avatar_url')}
    ]})
    .then(res.ok)
    .catch(res.serverError);
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
