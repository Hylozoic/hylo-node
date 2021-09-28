export async function createJoinRequest (userId, groupId, questionAnswers = []) {
  if (groupId && userId) {
    const pendingRequest = await JoinRequest.where({ user_id: userId, group_id: groupId, status: JoinRequest.STATUS.Pending}).fetch()
    if (pendingRequest) {
      return { request: pendingRequest }
    }
    // If there's an existing processed request then let's leave it and create a new one
    // Maybe they left the group and want back in? Or maybe initial request was rejected
    return JoinRequest.create({
      userId,
      groupId,
    })
    .then(async (request) => {
      for (let qa of questionAnswers) {
        await JoinRequestQuestionAnswer.forge({ join_request_id: request.id, question_id: qa.questionId, answer: qa.answer }).save()
      }
      return { request }
    })
  } else {
    throw new Error(`Invalid parameters to create join request`)
  }
}

export async function acceptJoinRequest (userId, joinRequestId) {
  const joinRequest = await JoinRequest.find(joinRequestId)
  if (joinRequest) {
    if (await GroupMembership.hasModeratorRole(userId, joinRequest.get('group_id'))) {
      return joinRequest.accept(userId)
    } else {
      throw new Error(`You do not have permission to do this`)
    }
  } else {
    throw new Error(`Invalid parameters to accept join request`)
  }
}

export async function cancelJoinRequest (userId, joinRequestId) {
  const joinRequest = await JoinRequest.find(joinRequestId)
  if (joinRequest) {
    if (joinRequest.get('user_id') === userId) {
      await joinRequest.save({ status: JoinRequest.STATUS.Canceled })
      return { success: true }
    } else {
      throw new Error(`You do not have permission to do this`)
    }
  } else {
    throw new Error(`Invalid parameters to cancel join request`)
  }
}

export async function declineJoinRequest (userId, joinRequestId) {
  const joinRequest = await JoinRequest.find(joinRequestId)
  if (joinRequest) {
    if (await GroupMembership.hasModeratorRole(userId, joinRequest.get('group_id'))) {
      await joinRequest.save({ status: JoinRequest.STATUS.Rejected })
      return joinRequest
    } else {
      throw new Error(`You do not have permission to do this`)
    }
  } else {
    throw new Error(`Invalid parameters to decline join request`)
  }
}
