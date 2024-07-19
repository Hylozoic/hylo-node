import { castArray, has } from 'lodash'

// handle a single entity or a list of entity or ids; do nothing if no ids or
// entities are passed
export function whereId (q, objectsOrIds, columnName) {
  if (!objectsOrIds) return
  const ids = castArray(objectsOrIds).map(x => has(x, 'id') ? x.id : x)
  if (ids.length > 1) {
    q.where(columnName, 'in', ids)
  } else if (ids.length > 0) {
    q.where(columnName, ids[0])
  }
}
