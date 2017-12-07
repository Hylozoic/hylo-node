import { sendMessageFromAxolotl } from '../../services/MessagingService'

export async function notifyModeratorsPost (flaggedItem) {
  const post = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  return sendToCommunities(flaggedItem, communities)
}

export async function notifyModeratorsComment (flaggedItem) {
  const comment = await flaggedItem.getObject()
  const post = comment.relations.post
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  return sendToCommunities(flaggedItem, communities)
}

export async function notifyModeratorsMember (flaggedItem) {
  const member = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithUser(member)
  return sendToCommunities(flaggedItem, communities)
}

export function sendToCommunities (flaggedItem, communities) {
  return Promise.map(communities, c =>
    c.load('moderators')
    .then(() => flaggedItem.getMessageText(c))
    .then(messageText => {
      const moderatorIds = c.relations.moderators.map(m => m.id)
      return sendMessageFromAxolotl(moderatorIds, messageText)
    }))
}
