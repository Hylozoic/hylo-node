import { sanitize } from 'hylo-utils/text'

export async function topicMutationPermissionCheck (userId, communityId) {
  if (!await Membership.find(userId, communityId)) {
    throw new Error("You're not a member of that community.")
  }
}

export async function createTopic (userId, topicName, communityId) {
  await topicMutationPermissionCheck(userId, communityId)
  const name = sanitize(topicName)
  const invalidReason = Tag.validate(name)
  if (invalidReason) {
    throw new Error(invalidReason)
  }

  const topic = await Tag.findOrCreate(name)
  const foo = await Tag.addToCommunity({
    community_id: communityId,
    tag_id: topic.id,
    user_id: userId
  })
  console.log('t', topic, foo)
  return topic
}

export async function subscribe (userId, topicId, communityId, isSubscribing) {
  await topicMutationPermissionCheck(userId, communityId)
  await TagFollow.subscribe(topicId, userId, communityId, isSubscribing)
  return { success: true }
}
