import { values } from 'lodash'
import * as types from './types'

export function validate ({ type, id, userId, url, stream }) {
  if (!values(types).includes(type)) {
    return Promise.reject(new Error('Validation error: Invalid type'))
  }

  if (!url && !stream) {
    return Promise.reject(new Error('Validation error: No url and no stream'))
  }

  if (!id) {
    return Promise.reject(new Error('Validation error: No id'))
  }

  return hasPermission(userId, type, id)
}

function hasPermission (userId, type, id) {
  if (type.startsWith('user')) {
    if (id === userId) return Promise.resolve()
    return Promise.reject(new Error('Validation error: Not allowed to change settings for another person'))
  }

  if (type.startsWith('community')) {
    return Membership.hasModeratorRole(userId, id)
    .then(ok => {
      if (!ok) throw new Error('Validation error: Not a moderator of this community')
    })
  }

  if (type.startsWith('network')) {
    return NetworkMembership.hasModeratorRole(userId, id)
    .then(ok => {
      if (!ok) throw new Error('Validation error: Not a moderator of this network')
    })
  }
}
