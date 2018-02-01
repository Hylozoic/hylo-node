import { curry } from 'lodash'
import { myCommunityIds, myNetworkCommunityIds } from '../models/util/queryFilters'
import { isFollowing } from '../models/group/queryUtils'
import GroupDataType from '../models/group/DataType'

export function makeFilterToggle (enabled) {
  return filterFn => relation =>
    enabled ? filterFn(relation) : relation
}

// This does not include users connected by a network
function sharesMembership (userId, q) {
  const subq = GroupMembership.forMember([userId, User.AXOLOTL_ID], Community)
  .query().pluck('group_id')

  q.where('group_memberships.active', true)
  q.where('group_memberships.group_id', 'in', subq)
}

export const membershipFilter = userId => relation =>
  relation.query(q => sharesMembership(userId, q))

export const personFilter = userId => relation => relation.query(async q => {
  // find all other memberships for users that share a network
  const sharedMemberships = GroupMembership.query(q3 => {
    filterCommunities(q3, 'group_id', userId)
    q3.where('group_data_type', GroupDataType.COMMUNITY)
  })

  // limit to users that are in those other memberships
  q.where('users.id', 'in', sharedMemberships.query().pluck('user_id'))
})

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
        const subq = PostMembership.query(q2 => {
          filterCommunities(q2, 'community_id', userId)
        }).query().select('post_id')

        return q.where('posts.id', 'in', subq)
      case 'votes':
        q.join('communities_posts', 'votes.post_id', 'communities_posts.post_id')
        return filterCommunities(q, 'communities_posts.community_id', userId)
      default:
        throw new Error(`sharedNetworkMembership filter does not support ${tableName}`)
    }
  }))

export const commentFilter = userId => relation => relation.query(q => {
  q.distinct()
  q.leftJoin('communities_posts', 'comments.post_id', 'communities_posts.post_id')
  q.where({'comments.active': true})
  q.where(q2 => {
    const groupIds = Group.pluckIdsForMember(userId, Post, isFollowing)
    q2.where('comments.post_id', 'in', groupIds)
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
