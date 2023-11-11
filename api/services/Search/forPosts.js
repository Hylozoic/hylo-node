import { get } from 'lodash'
import { countTotal } from '../../../lib/util/knex'
import { filterAndSortPosts } from './util'

export default function forPosts (opts) {

  return Post.query(qb => {
    qb.distinct()
    qb.limit(opts.limit || 20)
    qb.offset(opts.offset)
    qb.where({'posts.active': true})

    // Only find posts by active users
    qb.join('users', 'posts.user_id', '=', 'users.id')
    qb.where('users.active', true)

    // this counts total rows matching the criteria, disregarding limit,
    // which is useful for pagination
    countTotal(qb, 'posts', opts.totalColumnName)

    if (opts.users) { // alias createdBy
      qb.whereIn('posts.user_id', opts.users)
    }

    if (opts.excludeUsers) {
      qb.whereNotIn('posts.user_id', opts.excludeUsers)
    }

    // TODO: hmm, follows not being used anymore is this broken?
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
      qb.whereRaw('(posts.start_time > now())')
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

    if (opts.announcementsOnly) {
      qb.where('announcement', true)
    }

    if (opts.visibility) {
      qb.whereIn('visibility', opts.visibility)
    }

    if (opts.onlyPublic) {
      qb.where('is_public', opts.onlyPublic)
    }

    if (opts.interactedWithBy) {
      const subquery = bookshelf.knex.select('entity_id').from('reactions').whereIn('reactions.user_id', opts.interactedWithBy).where('reactions.entity_type', 'comment')
      // All reactions by specificed users that are on comments

      qb.join('comments', 'comments.post_id', '=', 'posts.id')
      qb.joinRaw(`join reactions on reactions.entity_id = posts.id AND reactions.entity_type = 'post'`)
      qb.whereIn('comments.user_id', opts.interactedWithBy)
      qb.orWhereIn('reactions.user_id', opts.interactedWithBy)
      qb.orWhereIn('comments.id', subquery)
    }

    if (opts.mentionsOf) {
      qb.join('activities', 'activities.post_id', '=', 'posts.id')
      qb.whereRaw(`activities.meta->>'reasons' like '%mention%'`)
      qb.whereIn(`activities.reader_id`, opts.mentionsOf)
    }

    filterAndSortPosts(Object.assign({}, opts, {
      search: opts.term,
      sortBy: opts.sort,
      // Sort pinned posts first only when looking at a single group and not looking at chat room
      showPinnedFirst: opts.type !== 'chat' && get(opts.groupIds, 'length') === 1
    }), qb)

    if (opts.omit) {
      qb.whereNotIn('posts.id', opts.omit)
    }

    if (opts.onlyMyGroups) {
      const selectIdsForMember = Group.selectIdsForMember(opts.currentUserId)
      qb.whereIn('groups_posts.group_id', selectIdsForMember)
    }

    if (opts.groupIds) {
      qb.whereIn('groups_posts.group_id', opts.groupIds)
    }

    if (opts.groupSlugs && opts.groupSlugs.length > 0) {
      // Make sure groups_posts is joined before we try to join groups on it
      qb.join('groups_posts', 'groups_posts.post_id', '=', 'posts.id')
      qb.queryContext({ alreadyJoinedGroupPosts: true }) // Track this so we don't double join in filters.js
      qb.join('groups', 'groups_posts.group_id', '=', 'groups.id')
      qb.whereIn('groups.slug', opts.groupSlugs)
    }

    if (get(opts.groupIds, 'length') !== 1) {
      // If not looking at a single group then hide axolotl welcome posts
      qb.where('posts.user_id', '!=', User.AXOLOTL_ID)
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
