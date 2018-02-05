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

export async function sendToCommunities (flaggedItem, communities) {
  const send = async (community, userIds) => {
    const text = await flaggedItem.getMessageText(community)
    return sendMessageFromAxolotl(userIds, text)
  }

  for (let community of communities) {
    const moderators = await community.moderators().fetch()
    await send(community, moderators.map(x => x.id))
  }

  const shouldSendToAdmins = process.env.HYLO_ADMINS &&
    flaggedItem.get('category') === FlaggedItem.Category.ILLEGAL

  if (shouldSendToAdmins) {
    const adminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))
    await send(communities[0], adminIds)
  }
}
