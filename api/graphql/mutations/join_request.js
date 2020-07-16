export async function joinCommunity (communityId, userId) {
  const user = await User.find(userId)
  const community = await Community.find(communityId)

  return GroupMembership.forPair(user, community, {includeInactive: true}).fetch()
    .then(existingMembership => {
      if (existingMembership) return existingMembership.get('active')
        ? existingMembership
        : existingMembership.save({active: true}, {patch: true}).then(membership => membership)
      if (!!community) return user.joinCommunity(community).then(membership => membership)
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

export async function acceptJoinRequest (joinRequestId, communityId, userId, moderatorId) {
  await JoinRequest.update(joinRequestId, { status: 1 }, moderatorId)
  await joinCommunity(communityId, userId)
  return await JoinRequest.find(joinRequestId)
}

export async function declineJoinRequest (joinRequestId) {
  await JoinRequest.update(joinRequestId, { status: 2 })
  return await JoinRequest.find(joinRequestId)
}
