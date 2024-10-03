const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function topicMutationPermissionCheck (userId, groupId) {
  const group = await Group.find(groupId)
  if (!group) {
    throw new GraphQLYogaError('That group does not exist.')
  }
  if (!await GroupMembership.hasActiveMembership(userId, group)) {
    throw new GraphQLYogaError("You're not a member of that group.")
  }
}

export async function createTopic (userId, topicName, groupId, isDefault, isSubscribing = true) {
  await topicMutationPermissionCheck(userId, groupId)
  const invalidReason = Tag.validate(topicName)
  if (invalidReason) {
    throw new GraphQLYogaError(invalidReason)
  }

  const topic = await Tag.findOrCreate(topicName)
  await Tag.addToGroup({
    group_id: groupId,
    tag_id: topic.id,
    user_id: userId,
    is_default: isDefault,
    isSubscribing
  })
  return topic
}

export async function subscribe (userId, topicId, groupId, isSubscribing) {
  await topicMutationPermissionCheck(userId, groupId)
  await TagFollow.subscribe(topicId, userId, groupId, isSubscribing)
  return { success: true }
}
