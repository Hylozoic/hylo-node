import { isEmpty } from 'lodash'

export default function validateNetworkData (userId, data) {
  if (!data.name) {
    throw new Error('title can\'t be blank')
  }
  if (isEmpty(data.community_ids)) return Promise.resolve()
  return Membership.inAllCommunities(userId, data.community_ids)
  .then(inAllCommunities =>
    inAllCommunities
    ? Promise.resolve()
    : Promise.reject(new Error('unable to add all those communities to the network'))
  )
}
