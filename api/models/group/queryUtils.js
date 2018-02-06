import { getDataTypeForModel } from './DataType'
import { castArray, has } from 'lodash'

export function isFollowing (q) {
  q.whereRaw("(group_memberships.settings->>'following')::boolean = true")
}

export function whereUserId (q, usersOrIds) {
  return whereId(q, usersOrIds, 'group_memberships.user_id')
}

export function whereGroupDataId (q, instanceIds) {
  return whereId(q, instanceIds, 'group_data_id')
}

// handle a single value or a list of instances or ids; do nothing if no ids or
// instances are passed
function whereId (q, instancesOrIds, columnName) {
  if (!instancesOrIds) return
  const ids = castArray(instancesOrIds).map(x => has(x, 'id') ? x.id : x)
  if (ids.length > 1) {
    q.whereIn(columnName, ids)
  } else {
    q.where(columnName, ids[0])
  }
}

export function queryForMember (q, userOrId, model) {
  whereUserId(q, userOrId)
  q.where({
    'group_memberships.group_data_type': getDataTypeForModel(model),
    'group_memberships.active': true
  })
}
