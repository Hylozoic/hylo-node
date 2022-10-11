const { GraphQLYogaError } = require('@graphql-yoga/node')
import { includes, isEmpty, trim } from 'lodash'

export default function validatePostData (userId, data) {
  const allowedTypes = [Post.Type.REQUEST, Post.Type.OFFER, Post.Type.DISCUSSION, Post.Type.PROJECT, Post.Type.EVENT, Post.Type.RESOURCE]
  if (data.type && !includes(allowedTypes, data.type)) {
    throw new GraphQLYogaError('not a valid type')
  }

  if (isEmpty(data.group_ids)) {
    throw new GraphQLYogaError('no groups specified')
  }

  if (data.topicNames && data.topicNames.length > 3) {
    throw new GraphQLYogaError('too many topics in post, maximum 3')
  }

  return Group.allHaveMember(data.group_ids, userId)
    .then(ok => ok ? Promise.resolve() : Promise.reject(new GraphQLYogaError('unable to post to all those groups')))
}
