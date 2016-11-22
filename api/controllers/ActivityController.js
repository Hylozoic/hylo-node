const userColumns = q => q.column('users.id', 'name', 'avatar_url')

const actionFromReason = reason => {
  // this is for backwards compatibility with angular site
  switch (reason) {
    case 'newComment':
      return 'comment'
    case 'commentMention':
      return 'mention'
    default:
      return reason
  }
}

const queryNotification = opts =>
  Notification.query(q => {
    q.where('reader_id', opts.userId)
    .leftJoin('activities', function () {
      this.on('activities.id', '=', 'notifications.activity_id')
    })
    q.where('medium', Notification.MEDIUM.InApp)
    q.limit(opts.limit)
    q.offset(opts.offset)
    q.select(bookshelf.knex.raw('notifications.*, count(*) over () as total'))
    q.orderBy('activities.created_at', 'desc')

    Activity.filterInactiveContent(q)
    if (opts.community) Activity.joinWithCommunity(opts.community.id, q)
  })

const fetchAndPresentNotification = (req, community) => {
  var total
  return queryNotification({
    userId: req.session.userId,
    limit: req.param('limit') || 10,
    offset: req.param('offset') || 0,
    community
  }).fetchAll({withRelated: [
    {'activity.actor': userColumns},
    {'activity.comment': q => q.column('id', 'text', 'created_at', 'post_id', 'user_id')},
    'activity.comment.thanks',
    {'activity.comment.thanks.thankedBy': userColumns},
    {'activity.comment.user': userColumns},
    {'activity.community': q => q.column('id', 'slug', 'name', 'avatar_url')},
    {'activity.post': q => q.column('id', 'name', 'user_id', 'type', 'description')},
    {'activity.post.communities': q => q.column('communities.id', 'slug')},
    {'activity.post.relatedUsers': userColumns}
  ]})
  .tap(nots => total = (nots.length > 0 ? nots.first().get('total') : 0))
  .then(nots => nots.map(not => {
    const comment = not.relations.activity.relations.comment
    const post = not.relations.activity.relations.post
    const attrs = not.relations.activity.toJSON()
    attrs.action = actionFromReason(Notification.priorityReason(not.relations.activity.get('meta').reasons))
    attrs.total = not.get('total')

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
    .then(community => fetchAndPresentNotification(req, community))
    .then(res.ok, res.serverError)
  },

  find: function (req, res) {
    return fetchAndPresentNotification(req)
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
        Activity.filterInactiveContent(q)
        if (community) Activity.joinWithCommunity(community.id, q)
        q.select('activities.id')
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
