const userColumns = q => q.column('users.id', 'name', 'avatar_url')

const queryActivity = opts =>
  Activity.query(q => {
    q.where('reader_id', opts.userId)
    q.limit(opts.limit)
    q.offset(opts.offset)
    q.select(bookshelf.knex.raw('activity.*, count(*) over () as total'))
    q.orderBy('created_at', 'desc')

    q.whereRaw('(comment.active = true or comment.id is null)')
    .leftJoin('comment', function () {
      this.on('comment.id', '=', 'activity.comment_id')
    })

    q.whereRaw('(post.active = true or post.id is null)')
    .leftJoin('post', function () {
      this.on('post.id', '=', 'activity.post_id')
    })

    if (opts.community) {
      q.where('post_community.community_id', opts.community.id)
      .join('post_community', function () {
        this.on('comment.post_id', 'post_community.post_id')
        .orOn('post.id', 'post_community.post_id')
      })
    }
  })

const fetchAndPresentActivity = (req, community) => {
  var total
  return queryActivity({
    userId: req.session.userId,
    limit: req.param('limit') || 10,
    offset: req.param('offset') || 0,
    community
  }).fetchAll({withRelated: [
    {actor: userColumns},
    {comment: q => q.column('id', 'text', 'created_at', 'post_id')},
    'comment.thanks',
    {'comment.thanks.thankedBy': userColumns},
    {post: q => q.column('id', 'name', 'user_id', 'type', 'description')},
    {'post.communities': q => q.column('community.id', 'slug')},
    {'post.relatedUsers': userColumns}
  ]})
  .tap(activities => total = (activities.length > 0 ? activities.first().get('total') : 0))
  .then(activities => activities.map(act => {
    const comment = act.relations.comment
    const post = act.relations.post
    const attrs = act.toJSON()
    if (post) {
      attrs.post.tag = post.get('type')
    }
    if (comment) {
      attrs.comment = CommentPresenter.present(comment, req.session.userId)
    }
    return attrs
  }))
  .then(acts => req.param('paginate') ? {total, items: acts} : acts)
}

module.exports = {
  findForCommunity: function (req, res) {
    Community.find(req.param('communityId'))
    .then(community => fetchAndPresentActivity(req, community))
    .then(res.ok, res.serverError)
    // TODO update notification count
  },

  find: function (req, res) {
    fetchAndPresentActivity(req)
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
