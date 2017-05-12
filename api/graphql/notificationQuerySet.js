import presentQuerySet from '../../lib/graphql-bookshelf-bridge/util/presentQuerySet'

const userColumns = q => q.column('users.id', 'name', 'avatar_url')

export default function notificationQuerySet (community, userId, options) {
  return Notification.query(q => {
    q.where('reader_id', userId)
    .leftJoin('activities', function () {
      this.on('activities.id', '=', 'notifications.activity_id')
    })
    q.where('medium', Notification.MEDIUM.InApp)
    q.limit(options.first)
    q.offset(options.offset)
    q.select(bookshelf.knex.raw('notifications.*, count(*) over () as total'))
    q.orderBy('activities.created_at', 'desc')

    Activity.filterInactiveContent(q)
    if (community) Activity.joinWithCommunity(community.id, q)
  })
}

export function fetchNotificationQuerySet (community, userId, options) {
  return notificationQuerySet(community, userId, options).fetchAll({withRelated: [
    {'activity.actor': userColumns},
    {'activity.comment': q => q.column('id', 'text', 'created_at', 'post_id', 'user_id')},
    'activity.comment.thanks',
    {'activity.comment.thanks.thankedBy': userColumns},
    {'activity.comment.user': userColumns},
    'activity.comment.media',
    {'activity.community': q => q.column('id', 'slug', 'name', 'avatar_url')},
    {'activity.post': q => q.column('id', 'name', 'user_id', 'type', 'description')},
    {'activity.parentComment': q => q.column('id', 'text', 'created_at', 'post_id', 'user_id')},
    {'activity.post.communities': q => q.column('communities.id', 'slug')},
    {'activity.post.relatedUsers': userColumns}
  ]})
  .then(({ models }) => presentQuerySet(models, options))
}
