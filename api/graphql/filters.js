import { curry } from 'lodash'
import { myCommunityIds, myNetworkCommunityIds } from '../models/util/queryFilters'

export function makeFilterToggle (enabled) {
  return filterFn => relation =>
    enabled ? filterFn(relation) : relation
}

export const sharedCommunityMembership = curry((tableName, userId, relation) =>
  relation.query(q => {
    const clauses = q => {
      q.where('communities_users.community_id', 'in', myCommunityIds(userId))
    }

    if (tableName === 'communities_users') return clauses(q)

    const columnName = tableName === 'users' ? 'users.id' : `${tableName}.user_id`
    return q.where(columnName, 'in',
      Membership.query(clauses).query().select('user_id'))
  }))

function filterCommunities (q, idColumn, userId) {
  // the effect of using `where` like this is to wrap everything within its
  // callback in parentheses -- this is necessary to keep `or` from "leaking"
  // out to the rest of the query
  q.where(inner =>
    inner.where(idColumn, 'in', myCommunityIds(userId))
    .orWhere(idColumn, 'in', myNetworkCommunityIds(userId)))
}

export const sharedNetworkMembership = curry((tableName, userId, relation) =>
  relation.query(q => {
    switch (tableName) {
      case 'communities':
        return filterCommunities(q, 'communities.id', userId)
      case 'posts':
        q.join('communities_posts', 'posts.id', 'communities_posts.post_id')
        return filterCommunities(q, 'communities_posts.community_id', userId)
      case 'votes':
        q.join('communities_posts', 'votes.post_id', 'communities_posts.post_id')
        return filterCommunities(q, 'communities_posts.community_id', userId)
      default:
        throw new Error(`sharedNetworkMembership filter does not support ${tableName}`)
    }
  }))

export const commentFilter = userId => relation => relation.query(q => {
  q.leftJoin('communities_posts', 'comments.post_id', 'communities_posts.post_id')
  q.where({active: true})
  q.where(q2 => {
    q2.where('comments.post_id', 'in', Follow.query().select('post_id').where('user_id', userId))
    .orWhere(q3 => filterCommunities(q3, 'communities_posts.community_id', userId))
  })
})

export const activePost = relation =>
  relation.query(q => q.where('posts.active', true))

export function communityTopicFilter (userId, {
  autocomplete,
  subscribed,
  communityId
}) {
  return q => {
    if (autocomplete) {
      q.join('tags', 'tags.id', 'communities_tags.tag_id')
      q.whereRaw('tags.name ilike ?', autocomplete + '%')
    }

    if (subscribed) {
      q.join('tag_follows', 'tag_follows.tag_id', 'communities_tags.tag_id')
      q.where('tag_follows.user_id', userId)
      q.whereRaw('tag_follows.community_id = communities_tags.community_id')
      if (communityId) {
        q.where('tag_follows.community_id', communityId)
      }
    }
  }
}
