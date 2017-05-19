import { includes, isEmpty, values } from 'lodash'

// Note: make sure to "blank-out" values in params / existing post merge...
export default function validatePostData (userId, data) {
  if (!data.name) {
    throw new Error('title can\'t be blank')
  }
  if (data.type && !includes(values(Post.Type), data.type)) {
    throw new Error('not a valid type')
  }
  if (isEmpty(data.community_ids)) {
    throw new Error('no communities specified')
  }
  return Membership.inAllCommunities(userId, data.community_ids)
  .then(ok => ok ? Promise.resolve() : Promise.reject(new Error('unable to post to all those communities')))
}
