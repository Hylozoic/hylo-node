export function myCommunityIds (userId) {
  return Membership.query().select('community_id')
  .where({user_id: userId, active: true})
}

export function myNetworkCommunityIds (userId) {
  return Network.activeCommunityIds(userId, true)
}
