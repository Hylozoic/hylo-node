import { curry } from 'lodash'

export function makeFilterToggle (enabled) {
  return queryFn => relation =>
    enabled ? relation.query(queryFn) : relation
}

export const sharedMembership = curry((tableName, userId, q) => {
  const clauses = q => {
    q.where('communities_users.community_id', 'in', myCommunityIds(userId))
  }

  if (tableName === 'communities_users') return clauses(q)

  const columnName = tableName === 'users' ? 'users.id' : `${tableName}.user_id`
  return q.where(columnName, 'in',
    Membership.query(clauses).query().select('user_id'))
})

// for determining if a post (either directly or through a foreign key) is in
// the same community as a user.
export const sharedPostMembership = curry((tableName, userId, q) => {
  const columnName = tableName === 'posts' ? 'posts.id' : `${tableName}.post_id`
  return q.where(columnName, 'in',
    PostMembership.query().select('post_id')
    .where('community_id', 'in', myCommunityIds(userId)))
})

export const activePost = curry((tableName, userId, q) => {
  return q.where('posts.active', true)
})

export function myCommunityIds (userId) {
  return Membership.query().select('community_id')
  .where({user_id: userId, active: true})
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
