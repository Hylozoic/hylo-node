export async function joinCommunity (communityId, userId) {
  const user = await User.find(userId)
  if(!user) throw new Error(`User id ${userId} not found`)
  const community = await Community.find(communityId)
  if(!community) throw new Error(`Community id ${communityId} not found`)
  if (!!community) return user.joinCommunity(community).then(membership => membership)
}

export async function createJoinRequest (communityId, userId) {
  return JoinRequest.create({
    userId: userId,
    communityId,
  })
  .then(request => ({ request }))
}

export async function acceptJoinRequest (joinRequestId, communityId, userId, moderatorId) {
  await joinCommunity(communityId, userId)
  await JoinRequest.update(joinRequestId, { status: 1 }, moderatorId)
  return await JoinRequest.find(joinRequestId)
}

export async function declineJoinRequest (joinRequestId) {
  await JoinRequest.update(joinRequestId, { status: 2 })
  return await JoinRequest.find(joinRequestId)
}
