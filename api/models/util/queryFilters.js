export function myCommunityIds (userId) {
  return Group.selectIdsForMember(userId, Community)
}

export function myNetworkCommunityIds (userId) {
  return Network.activeCommunityIds(userId, true)
}
