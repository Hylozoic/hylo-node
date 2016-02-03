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
      {actor: qb => qb.column('id', 'name', 'avatar_url')},
      {comment: qb => qb.column('id', 'comment_text', 'created_at')},
      {'comment.thanks': qb => qb.where('thanked_by_id', req.session.userId)},
      {post: qb => qb.column('id', 'name', 'user_id', 'type', 'description')},
      {'post.communities': qb => qb.column('community.id', 'slug')},
      {'post.relatedUsers': qb => qb.column('users.id', 'name', 'avatar_url')}
    ]})
    .tap(activities => total = (activities.length > 0 ? activities.first().get('total') : 0))
    .then(activities => {
      if (req.param('paginate')) {
        return {total, items: activities}
      } else {
        return activities
      }
    })
    .then(res.ok, res.serverError)
  },

  markAllRead: function (req, res) {
    Activity.query().where({reader_id: req.session.userId}).update({unread: false})
    .then(function () {
      res.ok({})
    })
    .catch(res.serverError.bind(res))
  },

  update: function (req, res) {
    Activity.find(req.param('activityId')).then(function (activity) {
      activity.attributes = _.pick(req.allParams(), 'unread')
      return activity.save()
    })
    .then(function () {
      res.ok({})
    })
    .catch(res.serverError.bind(res))
  }

}
