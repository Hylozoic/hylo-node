import { curry } from 'lodash'

export function makeFilterToggle (enabled) {
  return filterFn => relation =>
    enabled ? filterFn(relation) : relation
}

export const sharedMembership = curry((tableName, userId, relation) =>
  relation.query(q => {
    const clauses = q => {
      q.where('communities_users.community_id', 'in', myCommunityIds(userId))
    }

    if (tableName === 'communities_users') return clauses(q)

    const columnName = tableName === 'users' ? 'users.id' : `${tableName}.user_id`
    return q.where(columnName, 'in',
      Membership.query(clauses).query().select('user_id'))
  }))

// for determining if a post (either directly or through a foreign key) is in
// the same community as a user.
export const sharedPostMembership = curry((tableName, userId, relation) => {
  return relation.query(q => sharedPostMembershipClause(tableName, userId, q))
})

export const sharedPostMembershipClause = (tableName, userId, q) => {
  const columnName = tableName === 'posts' ? 'posts.id' : `${tableName}.post_id`
  return q.where(columnName, 'in',
    PostMembership.query().select('post_id')
    .where('community_id', 'in', myCommunityIds(userId)))
}

export const activePost = relation =>
  relation.query(q => q.where('posts.active', true))

export function myCommunityIds (userId) {
  return Membership.query().select('community_id')
  .where({user_id: userId, active: true})
}

export function myNetworkCommunityIds (userId) {
  return Network.activeCommunityIds(userId, true)
}

export function communityTopicFilter (userId, {
  autocomplete,
  subscribed,
  communityId,
  first,
  offset
}) {
  return q => {
    q.limit(first || 1000)
    q.offset(offset || 0)

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

export const skillInCommunitiesOrNetworksFilter = curry((userId, relation) =>
  relation.query(q => {
    q.distinct()
    q.select(bookshelf.knex.raw('upper("name")'))
    q.join('skills_users', 'skills.id', 'skills_users.skill_id')
    q.join('communities_users', 'skills_users.user_id', 'communities_users.user_id')
    q.whereIn('communities_users.community_id', myCommunityIds(userId))
    q.orWhereIn('communities_users.community_id', myNetworkCommunityIds(userId))
  }))
