import { sendMessageFromAxolotl } from '../../services/MessagingService'

export async function notifyModeratorsPost (flaggedItem) {
  const post = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const groups = await user.groupsSharedWithPost(post)
  const isPublic = post.attributes.is_public
  return sendToGroups(flaggedItem, groups, isPublic)
}

export async function notifyModeratorsComment (flaggedItem) {
  const comment = await flaggedItem.getObject()
  const post = comment.relations.post
  const user = flaggedItem.relations.user
  const groups = await user.groupsSharedWithPost(post)
  const isPublic = post.attributes.is_public
  return sendToGroups(flaggedItem, groups, isPublic)
}

export async function notifyModeratorsMember (flaggedItem) {
  const member = await flaggedItem.getObject()
  const user = flaggedItem.relations.user
  const groups = await user.groupsSharedWithUser(member)
  return sendToGroups(flaggedItem, groups, false)
}

export async function sendToGroups (flaggedItem, groups, isPublic) {
  const send = async (group, userIds) => {
    const text = await flaggedItem.getMessageText(group)
    return sendMessageFromAxolotl(userIds, text)
  }

  for (let group of groups) {
    const moderators = await group.moderators().fetch()
    await send(group, moderators.map(x => x.id))
  }

  // Send to Hylo Admins if category is Illegal OR Post is Public
  const shouldSendToAdmins = (process.env.HYLO_ADMINS &&
    flaggedItem.get('category') === FlaggedItem.Category.ILLEGAL) || (process.env.HYLO_ADMINS &&
      !!isPublic)

  if (shouldSendToAdmins) {
    const adminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))
    await send(groups[0], adminIds)
  }
}
