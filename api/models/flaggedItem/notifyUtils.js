import { sendMessageFromAxolotl } from '../../services/MessagingService'

export async function notifyModeratorsPost (flaggedItem) {
  const post = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  const isPublic = post.attributes.is_public
  return sendToCommunities(flaggedItem, communities, isPublic)
}

export async function notifyModeratorsComment (flaggedItem) {
  const comment = await flaggedItem.getObject()
  const post = comment.relations.post
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithPost(post)
  const isPublic = post.attributes.is_public
  return sendToCommunities(flaggedItem, communities, isPublic)
}

export async function notifyModeratorsMember (flaggedItem) {
  const member = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const communities = await user.communitiesSharedWithUser(member)
  return sendToCommunities(flaggedItem, communities, isPublic)
}

export async function sendToCommunities (flaggedItem, communities, isPublic) {
  const send = async (community, userIds) => {
    const text = await flaggedItem.getMessageText(community)
    return sendMessageFromAxolotl(userIds, text)
  }

  for (let community of communities) {
    const moderators = await community.moderators().fetch()
    await send(community, moderators.map(x => x.id))
  }

  // Send to Hylo Admins if category is Illegal OR Post is Public
  const shouldSendToAdmins = (process.env.HYLO_ADMINS &&
    flaggedItem.get('category') === FlaggedItem.Category.ILLEGAL) || (process.env.HYLO_ADMINS &&
      !!isPublic)

  if (shouldSendToAdmins) {
    const adminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))
    await send(communities[0], adminIds)
  }
}
