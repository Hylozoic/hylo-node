import { countTotal } from '../../../lib/util/knex'

export default function forModerationActions (opts) {
  return ModerationAction.query(qb => {
    qb.distinct()
    qb.limit(opts.limit || 20)
    qb.offset(opts.offset)
    qb.orderBy('id', 'desc')

    // this counts total rows matching the criteria, disregarding limit,
    // which is useful for pagination
    countTotal(qb, 'moderation_actions', opts.totalColumnName)

    // TODO COMDO: ok, so I either need to make a direct relationship to groups or dig through agreements to find the group relationship

    if (opts.slug) {
      // Make sure groups_posts is joined before we try to join groups on it
      // qb.join('groups_posts', 'groups_posts.post_id', '=', 'posts.id')
      qb.join('groups', 'moderation_actions.group_id', '=', 'groups.id')
      qb.where('groups.slug', opts.slug)
    }
  })
}
