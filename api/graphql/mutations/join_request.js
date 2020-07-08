export async function joinCommunity (communityId, userId) {
  const user = await User.find(userId)
  const community = await Community.find(communityId)
  return GroupMembership.forPair(user, community, {includeInactive: true}).fetch()
    .then(existingMembership => {
      if (existingMembership) return existingMembership.get('active')
        ? existingMembership
        : existingMembership.save({active: true}, {patch: true}).then(membership => { console.log('membership exists ==>', membership); return membership })
      if (!!community) return user.joinCommunity(community).then(membership => { console.log('membership created ==>', membership); return membership })
    })
    .catch(error => ({error: error.message}))
}

export async function createJoinRequest (communityId, userId) {
  return JoinRequest.create({
    userId: userId,
    communityId,
  })
  .then(request => ({ request }))
}
