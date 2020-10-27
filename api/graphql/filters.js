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
  const subq = GroupMembership.forMember([userId, User.AXOLOTL_ID], Community).query().select('group_id')

  q.where('group_memberships.active', true)
  q.whereIn('group_memberships.group_id', subq)
}

export const membershipFilter = userId => relation =>
  relation.query(q => sharesMembership(userId, q))

export const personFilter = userId => relation => relation.query(q => {
  if (userId) {
    // find all other memberships for users that share a network
    const sharedMemberships = GroupMembership.query(q3 => {
      q3.select('user_id')
      filterCommunities(q3, 'groups.group_data_id', userId)
      q3.join('groups', 'groups.id', 'group_memberships.group_id')
      q3.where('group_memberships.group_data_type', GroupDataType.COMMUNITY)
    })

    q.whereNotIn('users.id', BlockedUser.blockedFor(userId))

    // limit to users that are in those other memberships

    const sharedConnections = UserConnection.query(ucq =>{
      ucq.select('other_user_id')
      ucq.where('user_id', userId)
    })

    q.where(inner =>
      inner.where('users.id', User.AXOLOTL_ID)
      .orWhereIn('users.id', sharedMemberships.query())
      .orWhereIn('users.id', sharedConnections.query()))
  }
})

export const messageFilter = userId => relation => relation.query(q => {
  q.whereNotIn('user_id', BlockedUser.blockedFor(userId))
})

function filterCommunities (q, idColumn, userId) {
  // the effect of using `where` like this is to wrap everything within its
  // callback in parentheses -- this is necessary to keep `or` from "leaking"
  // out to the rest of the query
  q.where(inner => {
    inner
    .whereIn(idColumn, myCommunityIds(userId))
    .orWhereIn(idColumn, myNetworkCommunityIds(userId))
    if (idColumn === 'communities.id') {
      // XXX: hack to make sure to show public communities on the map when logged in
      inner.orWhere('communities.is_public', true)
    }
  })

  // non authenticated queries can only see public communities
  if (!userId && idColumn === 'communities.id') {
    q.where('communities.is_public', true)
  }
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

        return q.where(q2 => {
          q2.whereIn('posts.id', subq).orWhere('posts.is_public', true)
        })
      case 'votes':
        q.join('communities_posts', 'votes.post_id', 'communities_posts.post_id')
        return filterCommunities(q, 'communities_posts.community_id', userId)
      default:
        throw new Error(`sharedNetworkMembership filter does not support ${tableName}`)
    }
  }))

export const commentFilter = userId => relation => relation.query(q => {
  q.distinct()
  q.where({'comments.active': true})

  if (userId) {
    q.leftJoin('communities_posts', 'comments.post_id', 'communities_posts.post_id')
    q.leftJoin('posts', 'communities_posts.post_id', 'posts.id')
    q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))
    q.where(q2 => {
      const groupIds = Group.selectIdsForMember(userId, Post, isFollowing)
      q2.whereIn('comments.post_id', groupIds)
      .orWhere(q3 => filterCommunities(q3, 'communities_posts.community_id', userId))
      .orWhere('posts.is_public', true)
    })
  }
})

export const activePost = userId => relation => {
  return relation.query(q => {
    if (userId) {
      q.whereNotIn('posts.user_id', BlockedUser.blockedFor(userId))
    }
    q.where('posts.active', true)
  })
}

export const authFilter = (userId, tableName) => relation => {
  return relation.query(q => {
    // non authenticated queries can only see public things
    if (!userId) {
      q.where(tableName + '.is_public', true)
    }
  })
}

export function communityTopicFilter (userId, {
  autocomplete,
  communityId,
  isDefault,
  subscribed,
  visibility
}) {
  return q => {
    if (communityId) {
      q.where('communities_tags.community_id', communityId)
    }

    if (autocomplete) {
      q.join('tags', 'tags.id', 'communities_tags.tag_id')
      q.whereRaw('tags.name ilike ?', autocomplete + '%')
    }

    if (isDefault) {
      q.where('communities_tags.is_default', true)
    }

    if (subscribed) {
      q.join('tag_follows', 'tag_follows.tag_id', 'communities_tags.tag_id')
      q.where('tag_follows.user_id', userId)
      q.whereRaw('tag_follows.community_id = communities_tags.community_id')
    }

    if (visibility) {
      q.whereIn('communities_tags.visibility', visibility)
    }
  }
}
