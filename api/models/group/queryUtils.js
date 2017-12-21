import { getDataTypeForModel } from './DataType'

export function isFollowing (q) {
  q.whereRaw("(group_memberships.settings->>'following')::boolean = true")
}

// handle a single value or a list of user instances or ids
export function whereUserId (q, userOrId) {
  if (Array.isArray(userOrId)) {
    const userIds = userOrId.map(x => x instanceof User ? x.id : x)
    q.where('group_memberships.user_id', 'in', userIds)
  } else {
    q.where('group_memberships.user_id', userOrId instanceof User ? userOrId.id : userOrId)
  }
}

export function queryForMember (q, userOrId, model) {
  whereUserId(q, userOrId)
  q.where({
    'group_memberships.group_data_type': getDataTypeForModel(model),
    'group_memberships.active': true
  })
}
