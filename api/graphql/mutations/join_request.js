export async function joinGroup (groupId, userId) {
  const user = await User.find(userId)
  if(!user) throw new Error(`User id ${userId} not found`)
  const group = await Group.find(groupId)
  if(!group) throw new Error(`Group id ${groupId} not found`)
  if (!!group) return user.joinGroup(group).then(membership => membership)
}

export async function createJoinRequest (groupId, userId) {
  if (groupId && userId) {
    return JoinRequest.create({
      userId,
      groupId,
    })
    .then(request => ({ request }))
  } else {
    throw new Error(`Invalid parameters to create join request`)
  }
}

export async function acceptJoinRequest (joinRequestId, groupId, userId, moderatorId) {
  if (joinRequestId && groupId && userId && moderatorId) {
    await joinGroup(groupId, userId)
    await JoinRequest.update(joinRequestId, { status: 1 }, moderatorId)
    return await JoinRequest.find(joinRequestId)
  } else {
    throw new Error(`Invalid parameters to accept join request`)
  }
}

export async function declineJoinRequest (joinRequestId) {
  if (joinRequestId) {
    await JoinRequest.update(joinRequestId, { status: 2 })
    return await JoinRequest.find(joinRequestId)
  } else {
    throw new Error(`Invalid parameters to decline join request`)
  }
}
