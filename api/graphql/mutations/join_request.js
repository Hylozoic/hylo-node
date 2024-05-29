const { GraphQLYogaError } = require('@graphql-yoga/node')

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
      groupId
    })
      .then(async (request) => {
        for (const qa of questionAnswers) {
          await GroupJoinQuestionAnswer.forge({ group_id: groupId, join_request_id: request.id, question_id: qa.questionId, answer: qa.answer, user_id: userId }).save()
        }
        return { request }
      })
  } else {
    throw new GraphQLYogaError('Invalid parameters to create join request')
  }
}

export async function acceptJoinRequest (userId, joinRequestId) {
  const joinRequest = await JoinRequest.find(joinRequestId)
  if (joinRequest) {
    if (await GroupMembership.hasResponsibility(userId, joinRequest.get('group_id'), Responsibility.constants.RESP_ADD_MEMBERS)) {
      return joinRequest.accept(userId)
    } else {
      throw new GraphQLYogaError('You do not have permission to accept a join request')
    }
  } else {
    throw new GraphQLYogaError('Invalid parameters to accept join request')
  }
}

export async function cancelJoinRequest (userId, joinRequestId) {
  const joinRequest = await JoinRequest.find(joinRequestId)
  if (joinRequest) {
    if (joinRequest.get('user_id') === userId) {
      await joinRequest.save({ status: JoinRequest.STATUS.Canceled })
      return { success: true }
    } else {
      throw new GraphQLYogaError('You do not have permission to do this')
    }
  } else {
    throw new GraphQLYogaError('Invalid parameters to cancel join request')
  }
}

export async function declineJoinRequest (userId, joinRequestId) {
  const joinRequest = await JoinRequest.find(joinRequestId)
  if (joinRequest) {
    if (await GroupMembership.hasResponsibility(userId, joinRequest.get('group_id'), Responsibility.constants.RESP_ADD_MEMBERS)) {
      await joinRequest.save({ status: JoinRequest.STATUS.Rejected })
      return joinRequest
    } else {
      throw new GraphQLYogaError('You do not have permission to do this')
    }
  } else {
    throw new GraphQLYogaError('Invalid parameters to decline join request')
  }
}
