import { includes, isEmpty, trim } from 'lodash'

export default function validatePostData (userId, data) {
  if (!trim(data.name)) {
    throw new Error('title can\'t be blank')
  }

  const allowedTypes = [Post.Type.REQUEST, Post.Type.OFFER, Post.Type.DISCUSSION, Post.Type.PROJECT, Post.Type.EVENT, Post.Type.RESOURCE]
  if (data.type && !includes(allowedTypes, data.type)) {
    throw new Error('not a valid type')
  }

  if (isEmpty(data.group_ids)) {
    throw new Error('no communities specified')
  }

  if (data.topicNames && data.topicNames.length > 3) {
    throw new Error('too many topics in post, maximum 3')
  }

  return Group.allHaveMember(data.group_ids, userId)
    .then(ok => ok ? Promise.resolve() : Promise.reject(new Error('unable to post to all those communities')))
}
