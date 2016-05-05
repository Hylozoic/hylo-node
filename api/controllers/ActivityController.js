const userColumns = q => q.column('users.id', 'name', 'avatar_url')

const queryActivity = opts =>
  Activity.query(q => {
    q.where('reader_id', opts.userId)
    q.limit(opts.limit)
    q.offset(opts.offset)
    q.select(bookshelf.knex.raw('activity.*, count(*) over () as total'))
    q.orderBy('created_at', 'desc')

    Activity.joinWithContent(q)
    if (opts.community) Activity.joinWithCommunity(opts.community.id, q)
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
    {'comment.user': userColumns},
    {post: q => q.column('id', 'name', 'user_id', 'type', 'description')},
    {'post.communities': q => q.column('community.id', 'slug')},
    {'post.relatedUsers': userColumns}
  ]})
  .tap(acts => total = (acts.length > 0 ? acts.first().get('total') : 0))
  .then(acts => acts.map(act => {
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
    return Community.find(req.param('communityId'), {
      withRelated: [
        {memberships: q => q.where({user_id: req.session.userId})}
      ]
    })
    .tap(community => req.param('resetCount') &&
      community.relations.memberships.first()
      .save({new_notification_count: 0}, {patch: true}))
    .then(community => fetchAndPresentActivity(req, community))
    .then(res.ok, res.serverError)
  },

  find: function (req, res) {
    return fetchAndPresentActivity(req)
    .tap(() => req.param('resetCount') && User.query()
      .where('id', req.session.userId)
      .update({new_notification_count: 0}))
    .then(res.ok, res.serverError)
  },

  markAllRead: function (req, res) {
    return (req.param('communityId')
      ? Community.find(req.param('communityId'))
      : Promise.resolve())
    .then(community => {
      const subq = Activity.query(q => {
        q.where({reader_id: req.session.userId, unread: true})
        Activity.joinWithContent(q)
        if (community) Activity.joinWithCommunity(community.id, q)
        q.select('activity.id')
      }).query()
      return Activity.query().whereIn('id', subq).update({unread: false})
    })
    .then(() => res.ok({}), res.serverError)
  },

  update: function (req, res) {
    return Activity.find(req.param('activityId'))
    .tap(a => a.attributes = _.pick(req.allParams(), 'unread'))
    .tap(a => a.save())
    .then(() => res.ok({}))
    .catch(res.serverError)
  }

}
