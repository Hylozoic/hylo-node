import CommunityService from '../../services/CommunityService'
import convertGraphqlData from './convertGraphqlData'

export async function updateCommunity (userId, communityId, changes) {
  const community = await getModeratedCommunity(userId, communityId)
  return community.update(convertGraphqlData(changes))
}

export async function addModerator (userId, personId, communityId) {
  const community = await getModeratedCommunity(userId, communityId)
  await GroupMembership.setModeratorRole(personId, community)
  return community
}

export async function removeModerator (userId, personId, communityId) {
  const community = await getModeratedCommunity(userId, communityId)
  await GroupMembership.removeModeratorRole(personId, community)
  return community
}

/**
 * As a moderator, removes member from a community.
 */
export async function removeMember (loggedInUserId, userIdToRemove, communityId) {
  const community = await getModeratedCommunity(loggedInUserId, communityId)
  await CommunityService.removeMember(userIdToRemove, communityId)
  return community
}

export async function regenerateAccessCode (userId, communityId) {
  const community = await getModeratedCommunity(userId, communityId)
  const code = await Community.getNewAccessCode()
  return community.save({beta_access_code: code}, {patch: true}) // eslint-disable-line camelcase
}

export function createCommunity (userId, data) {
  return Community.create(userId, data)
}

async function getModeratedCommunity (userId, communityId) {
  const community = await Community.find(communityId)
  if (!community) {
    throw new Error('Community not found')
  }

  const isModerator = await GroupMembership.hasModeratorRole(userId, community)
  if (!isModerator) {
    throw new Error("You don't have permission to moderate this community")
  }

  return community
}
