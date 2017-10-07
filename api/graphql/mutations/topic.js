export function subscribe (userId, topicId, communityId, isSubscribing) {
  return TagFollow.subscribe(topicId, userId, communityId, isSubscribing)
  .then(() => ({success: true}))
}
