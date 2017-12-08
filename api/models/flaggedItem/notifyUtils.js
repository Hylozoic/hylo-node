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
  var sendToAdmins = () => Promise.resolve()
  if (flaggedItem.get('category') === FlaggedItem.Category.ILLEGAL &&
    process.env.HYLO_ADMINS) {
    const adminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))
    const community = communities[0]
    sendToAdmins = () =>
      flaggedItem.getMessageText(community)
      .then(messageText => sendMessageFromAxolotl(adminIds, messageText))
  }
  return Promise.map(communities, c =>
    c.load('moderators')
    .then(() => flaggedItem.getMessageText(c))
    .then(messageText => {
      const moderatorIds = c.relations.moderators.map(m => m.id)
      return sendMessageFromAxolotl(moderatorIds, messageText)
    }))
  .then(sendToAdmins)
}
