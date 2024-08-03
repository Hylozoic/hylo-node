const { GraphQLYogaError } = require('@graphql-yoga/node')
import { values } from 'lodash'
import * as types from './types'

export function validate ({ type, id, userId, url, stream }) {
  if (!values(types).includes(type)) {
    return Promise.reject(new GraphQLYogaError('Validation error: Invalid type'))
  }

  if (!url && !stream) {
    return Promise.reject(new GraphQLYogaError('Validation error: No url and no stream'))
  }

  if (!id) {
    return Promise.reject(new GraphQLYogaError('Validation error: No id'))
  }

  return hasPermission(userId, type, id)
}

async function hasPermission (userId, type, id) {
  if (type.startsWith('user')) {
    if (id === userId) return Promise.resolve()
    return Promise.reject(new GraphQLYogaError('Validation error: Not allowed to change settings for another person'))
  }

  if (type.startsWith('group')) {
    const group = await Group.find(id)
    if (!group ||
      !(await GroupMembership.hasResponsibility(userId, group, Responsibility.constants.RESP_ADMINISTRATION))) {
      throw new GraphQLYogaError('Validation error: Not an administrator of this group')
    }
  }

  if (type.startsWith('post')) {
    if (id === 'new') return Promise.resolve()
    return Post.find(id)
    .then(post => {
      if (!post || post.get('user_id') !== userId) throw new GraphQLYogaError('Validation error: Not allowed to edit this post')
    })
  }
}
