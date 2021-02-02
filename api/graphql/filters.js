import { curry } from 'lodash'
import { isFollowing } from '../models/group/queryUtils'
import GroupDataType from '../models/group/DataType'

export function makeFilterToggle (enabled) {
  return filterFn => relation =>
    enabled ? filterFn(relation) : relation
}

// This does not include users connected by a network
// TODO: is this right now?
function sharesMembership (userId, q) {
  const subq = GroupMembership.forMember([userId, User.AXOLOTL_ID]).query().select('group_id')

  q.where('group_memberships.active', true)
  q.whereIn('group_memberships.group_id', subq)
}

export const membershipFilter = userId => relation =>
  relation.query(q => sharesMembership(userId, q))

export const personFilter = userId => relation => relation.query(q => {
  if (userId) {
    // find all other memberships for users that share a network
    const sharedMemberships = GroupMembership.query(q3 => {
      q3.select('group_memberships.user_id')
      filterGroups(q3, 'group_memberships.group_id', userId)
    })

    q.whereNotIn('users.id', BlockedUser.blockedFor(userId))

    // limit to users that are in those other memberships

    const sharedConnections = UserConnection.query(ucq =>{
      ucq.select('other_user_id')
      ucq.where('user_connections.user_id', userId)
    })

    q.where(inner =>
      inner.where('users.id', User.AXOLOTL_ID)
      .orWhereIn('users.id', sharedMemberships.query())
      .orWhereIn('users.id', sharedConnections.query()))
  }
})

export const messageFilter = userId => relation => relation.query(q => {
  q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))
})

// Which groups can the user see
function filterGroups (q, idColumn, userId) {
  // the effect of using `where` like this is to wrap everything within its
  // callback in parentheses -- this is necessary to keep `or` from "leaking"
  // out to the rest of the query
  q.where(inner => {
    inner.whereIn(idColumn, Group.selectIdsForMember(userId))

    if (idColumn === 'groups.id') {
      // XXX: hack to make sure to show public groups on the map when logged in
      inner.orWhere('groups.visibility', Group.Visibility.PUBLIC)
    }
  })

  // non authenticated queries can only see public groups
  if (!userId && idColumn === 'groups.id') {
    q.where('groups.visibility', Group.Visibility.PUBLIC)
  }
}

export const sharedGroupMembership = curry((tableName, userId, relation) => {
  return relation.query(q => {
    switch (tableName) {
      case 'groups':
        return filterGroups(q, 'groups.id', userId)
      case 'posts':
        const subq = PostMembership.query(q2 => {
          filterGroups(q2, 'group_id', userId)
        }).query().select('post_id')

        return q.where(q2 => {
          q2.whereIn('posts.id', subq).orWhere('posts.is_public', true)
        })
      case 'votes':
        q.join('groups_posts', 'votes.post_id', 'groups_posts.post_id')
        return filterGroups(q, 'groups_posts.group_id', userId)
      default:
        throw new Error(`sharedGroupMembership filter does not support ${tableName}`)
    }
  })})

export const commentFilter = userId => relation => relation.query(q => {
  q.distinct()
  q.where({'comments.active': true})

  if (userId) {
    q.leftJoin('groups_posts', 'comments.post_id', 'groups_posts.post_id')
    q.join('posts', 'groups_posts.post_id', 'posts.id')
    q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))

    q.where(q2 => {
      const followedPostIds = PostUser.followedPostIds(userId)
      q2.whereIn('comments.post_id', followedPostIds)
      .orWhere(q3 => filterGroups(q3, 'groups_posts.group_id', userId))
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

export function groupTopicFilter (userId, {
  autocomplete,
  groupId,
  isDefault,
  subscribed,
  visibility
}) {
  return q => {
    if (groupId) {
      q.where('groups_tags.group_id', groupId)
    }

    if (autocomplete) {
      q.join('tags', 'tags.id', 'groups_tags.tag_id')
      q.whereRaw('tags.name ilike ?', autocomplete + '%')
    }

    if (isDefault) {
      q.where('groups_tags.is_default', true)
    }

    if (subscribed) {
      q.join('tag_follows', 'tag_follows.tag_id', 'groups_tags.tag_id')
      q.where('tag_follows.user_id', userId)
      q.whereRaw('tag_follows.group_id = groups_tags.group_id')
    }

    if (visibility) {
      q.whereIn('groups_tags.visibility', visibility)
    }
  }
}
