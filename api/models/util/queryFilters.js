export function myCommunityIds (userId) {
  return Group.pluckIdsForMember(userId, Community)
}

export function myNetworkCommunityIds (userId) {
  return Network.activeCommunityIds(userId, true)
}
