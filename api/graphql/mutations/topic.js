import { sanitize } from 'hylo-utils/text'

export async function topicMutationPermissionCheck (userId, communityId) {
  const community = await Community.find(communityId)
  if (!community) {
    throw new Error('That community does not exist.')
  }
  if (!await GroupMembership.hasActiveMembership(userId, community)) {
    throw new Error("You're not a member of that community.")
  }
}

export async function createTopic (userId, topicName, communityId, isDefault, isSubscribing = true) {
  await topicMutationPermissionCheck(userId, communityId)
  const name = sanitize(topicName)
  const invalidReason = Tag.validate(name)
  if (invalidReason) {
    throw new Error(invalidReason)
  }

  const topic = await Tag.findOrCreate(name)
  await Tag.addToCommunity({
    community_id: communityId,
    tag_id: topic.id,
    user_id: userId,
    is_default: isDefault,
    isSubscribing
  })
  return topic
}

export async function subscribe (userId, topicId, communityId, isSubscribing) {
  await topicMutationPermissionCheck(userId, communityId)
  await TagFollow.subscribe(topicId, userId, communityId, isSubscribing)
  return { success: true }
}
