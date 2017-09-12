import { includes, isEmpty } from 'lodash'

export default function validatePostData (userId, data) {
  if (!data.name) {
    throw new Error('title can\'t be blank')
  }
  const allowedTypes = [Post.Type.REQUEST, Post.Type.OFFER, Post.Type.DISCUSSION]
  if (data.type && !includes(allowedTypes, data.type)) {
    throw new Error('not a valid type')
  }
  if (isEmpty(data.community_ids)) {
    throw new Error('no communities specified')
  }
  return Membership.inAllCommunities(userId, data.community_ids)
  .then(ok => ok ? Promise.resolve() : Promise.reject(new Error('unable to post to all those communities')))
}
