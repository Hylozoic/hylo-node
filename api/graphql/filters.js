import { curry } from 'lodash'

export function makeFilterToggle (enabled) {
  return queryFn => relation =>
    enabled ? relation.query(queryFn) : relation
}

export const sharedMembership = curry((tableName, userId, q) => {
  const clauses = q => {
    q.where('communities_users.community_id', 'in', myCommunityIds(userId))
    q.where('communities_users.active', true)
  }

  if (tableName === 'communities_users') return clauses(q)

  const columnName = tableName === 'users' ? 'users.id' : `${tableName}.user_id`
  return q.where(columnName, 'in',
    Membership.query(clauses).query().select('user_id'))
})

export const sharedPostMembership = curry((tableName, userId, q) => {
  const columnName = tableName === 'posts' ? 'posts.id' : `${tableName}.post_id`
  return q.where(columnName, 'in',
    PostMembership.query().select('post_id')
    .where('community_id', 'in', myCommunityIds(userId)))
})

export function myCommunityIds (userId) {
  return Membership.query().select('community_id')
  .where({user_id: userId, active: true})
}
