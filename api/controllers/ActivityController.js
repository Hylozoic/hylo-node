var userColumns = q => q.column('users.id', 'name', 'avatar_url')

module.exports = {
  find: function (req, res) {
    var total

    Activity.query(function (qb) {
      qb.where('reader_id', req.session.userId)
      qb.limit(req.param('limit') || 10)
      qb.offset(req.param('offset') || 0)
      qb.select(bookshelf.knex.raw('activity.*, count(*) over () as total'))
      qb.orderBy('created_at', 'desc')

      qb.whereRaw('(comment.active = true or comment.id is null)')
      .leftJoin('comment', function () {
        this.on('comment.id', '=', 'activity.comment_id')
      })

      qb.whereRaw('(post.active = true or post.id is null)')
      .leftJoin('post', function () {
        this.on('post.id', '=', 'activity.post_id')
      })
    })
    .fetchAll({withRelated: [
      {actor: userColumns},
      {comment: qb => qb.column('id', 'text', 'created_at', 'post_id')},
      'comment.thanks',
      {'comment.thanks.thankedBy': userColumns},
      {post: qb => qb.column('id', 'name', 'user_id', 'type', 'description')},
      {'post.communities': qb => qb.column('community.id', 'slug')},
      {'post.relatedUsers': userColumns}
    ]})
    .tap(activities => total = (activities.length > 0 ? activities.first().get('total') : 0))
    .then(activities => activities.map(activity => {
      var comment = activity.relations.comment
      var attrs = activity.toJSON()
      if (comment) {
        attrs.comment = CommentPresenter.present(comment, req.session.userId)
      }
      return attrs
    }))
    .then(activities => {
      if (req.param('paginate')) {
        return {total, items: activities}
      } else {
        return activities
      }
    })
    .tap(() => req.param('resetCount') && User.query()
      .where('id', req.session.userId)
      .update({new_notification_count: 0}))
    .then(res.ok, res.serverError)
  },

  markAllRead: function (req, res) {
    Activity.query()
    .where({reader_id: req.session.userId})
    .update({unread: false})
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  update: function (req, res) {
    Activity.find(req.param('activityId'))
    .tap(a => a.attributes = _.pick(req.allParams(), 'unread'))
    .tap(a => a.save())
    .then(() => res.ok({}))
    .catch(res.serverError)
  }

}
