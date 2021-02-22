export async function createJoinRequest (userId, groupId, questionAnswers = []) {
  if (groupId && userId) {
    for (let qa of questionAnswers) {
      const questionAnswer = (await GroupQuestionAnswer.where({ user_id: userId, group_question_id: qa.questionId }).fetch()) ||
        new GroupQuestionAnswer({ user_id: userId, group_question_id: qa.questionId })
      await questionAnswer.save({ answer: qa.answer })
    }

    const pendingRequest = await JoinRequest.where({ user_id: userId, group_id: groupId, status: JoinRequest.STATUS.Pending}).fetch()
    if (pendingRequest) {
      return { request: pendingRequest }
    }
    // If there's an existing processed request then let's leave it and create a new one
    // Maybe they left the group and want back in? Or maybe initial request was rejected
    console.log("creating new one")
    return JoinRequest.create({
      userId,
      groupId,
    })
    .then(request => ({ request }))
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
