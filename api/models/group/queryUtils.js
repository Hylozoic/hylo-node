import { getDataTypeForModel } from './DataType'
import { castArray, has } from 'lodash'

export function isFollowing (q) {
  q.whereRaw("(group_memberships.settings->>'following')::boolean = true")
}

export function whereUserId (q, usersOrIds) {
  return whereId(q, usersOrIds, 'group_memberships.user_id')
}

// handle a single group or a list of groups or ids; do nothing if no ids or
// groups are passed
export function whereId (q, groupsOrIds, columnName) {
  if (!groupsOrIds) return
  const ids = castArray(groupsOrIds).map(x => has(x, 'id') ? x.id : x)
  if (ids.length > 1) {
    q.where(columnName, 'in', ids)
  } else if (ids.length > 0) {
    q.where(columnName, ids[0])
  }
}

export function queryForMember (q, userOrId) {
  whereUserId(q, userOrId)
  q.where({
    'group_memberships.active': true
  })
}
