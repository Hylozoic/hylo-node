import { get } from 'lodash'
import { countTotal } from '../../../lib/util/knex'
import { filterAndSortPosts } from './util'

export default function forPosts (opts) {
  return Post.query(qb => {
    qb.limit(opts.limit || 20)
    qb.offset(opts.offset)
    qb.where({'posts.active': true})

    // this counts total rows matching the criteria, disregarding limit,
    // which is useful for pagination
    countTotal(qb, 'posts', opts.totalColumnName)

    if (opts.users) {
      qb.whereIn('posts.user_id', opts.users)
    }

    if (opts.excludeUsers) {
      qb.whereNotIn('posts.user_id', opts.excludeUsers)
    }

    if (opts.type === Post.Type.THREAD || opts.follower) {
      qb.join('follows', 'follows.post_id', '=', 'posts.id')
      if (opts.type === Post.Type.THREAD) {
        qb.where('follows.user_id', opts.follower)
      } else if (opts.follower) {
        qb.where('follows.user_id', opts.follower)
        qb.whereRaw('(posts.user_id != ? or posts.user_id is null)', opts.follower)
      }
    }

    if (opts.type === 'event' && opts.filter === 'future') {
      qb.whereRaw('(posts.starts_at > now())')
    }

    if (opts.type === 'project' && opts.filter === 'mine') {
      qb.leftJoin('follows', 'posts.id', 'follows.post_id')
      qb.where(function () {
        this.where('posts.user_id', opts.currentUserId)
        .orWhere('follows.user_id', opts.currentUserId)
      })
    }

    if (opts.start_time && opts.end_time) {
      qb.whereRaw('((posts.created_at between ? and ?) or (posts.updated_at between ? and ?))',
        [opts.start_time, opts.end_time, opts.start_time, opts.end_time])
    }

    if (opts.visibility) {
      qb.whereIn('visibility', opts.visibility)
    }

    filterAndSortPosts({
      search: opts.term,
      sortBy: opts.sort,
      topic: opts.topic,
      type: opts.type,
      showPinnedFirst: get(opts.communities, 'length') === 1
    }, qb)

    if (opts.omit) {
      qb.whereNotIn('posts.id', opts.omit)
    }

    if (opts.communities) {
      qb.select('communities_posts.pinned')
      qb.join('communities_posts', 'communities_posts.post_id', '=', 'posts.id')
      qb.whereIn('communities_posts.community_id', opts.communities)
      qb.groupBy(['posts.id', 'communities_posts.post_id', 'communities_posts.pinned'])
    }

    if (opts.networks) {
      qb.join('networks_posts', 'networks_posts.post_id', '=', 'posts.id')
      qb.whereIn('networks_posts.network_id', opts.networks)
      qb.groupBy(['posts.id', 'networks_posts.post_id'])
    }

    if (opts.parent_post_id) {
      qb.where('parent_post_id', opts.parent_post_id)
      qb.where('is_project_request', false)
    }

    if (!opts.parent_post_id && !opts.includeChildren) {
      qb.where('parent_post_id', null)
    }
  })
}
