import addTermToQueryBuilder from './addTermToQueryBuilder'
import { get } from 'lodash'
import { countTotal } from '../../../lib/util/knex'

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

    if (opts.tag) {
      qb.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
      qb.whereIn('posts_tags.tag_id', [opts.tag])
    }

    if (opts.term) {
      addTermToQueryBuilder(opts.term, qb, {
        columns: ['posts.name', 'posts.description']
      })
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

    if (!opts.type || opts.type === 'all') {
      qb.where(function () {
        this.where('posts.type', 'not in', ['welcome', Post.Type.THREAD])
        .orWhere('posts.type', null)
      })
    } else if (opts.type === 'discussion') {
      qb.where({type: null})
    } else if (opts.type !== 'all+welcome') {
      qb.where({type: opts.type})
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

    if (opts.sort === 'suggested') {
      qb.join('user_post_relevance', 'user_post_relevance.post_id', '=', 'posts.id')
      qb.where('user_post_relevance.user_id', opts.forUser)
      qb.orderBy('similarity', 'desc')
      qb.groupBy('similarity')
    } else if (opts.sort === 'fulfilled_at') {
      qb.orderByRaw('posts.fulfilled_at desc, posts.updated_at desc')
    } else if (Array.isArray(opts.sort)) {
      qb.orderBy(opts.sort[0], opts.sort[1])
    } else if (opts.sort === 'posts.updated_at' && get(opts.communities, 'length') === 1) {
      qb.orderByRaw('communities_posts.pinned desc, posts.updated_at desc')
    } else if (opts.sort) {
      qb.orderBy(opts.sort, 'desc')
    }

    if (opts.omit) {
      qb.whereNotIn('posts.id', opts.omit)
    }

    if (opts.communities) {
      qb.select('communities_posts.pinned')
      qb.join('communities_posts', 'communities_posts.post_id', '=', 'posts.id')
      qb.whereIn('communities_posts.community_id', opts.communities)
      qb.groupBy(['posts.id', 'communities_posts.post_id', 'communities_posts.pinned'])
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
