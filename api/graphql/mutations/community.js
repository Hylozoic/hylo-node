import CommunityService from '../../services/CommunityService'
import convertGraphqlData from './convertGraphqlData'

export async function updateCommunity (userId, communityId, changes) {
  const community = await Community.find(communityId)
  const isModerator = await GroupMembership.hasModeratorRole(userId, community)
  if (isModerator) {
    return community.update(convertGraphqlData(changes))
  } else {
    throw new Error("You don't have permission to modify this community")
  }
}

export async function addModerator (userId, personId, communityId) {
  const community = await Community.find(communityId)
  const isModerator = await GroupMembership.hasModeratorRole(userId, community)
  if (isModerator) {
    await GroupMembership.setModeratorRole(personId, community)
    return community
  } else {
    throw new Error("You don't have permission to modify this community")
  }
}

export async function removeModerator (userId, personId, communityId) {
  const community = await Community.find(communityId)
  const isModerator = await GroupMembership.hasModeratorRole(userId, community)
  if (isModerator) {
    await GroupMembership.removeModeratorRole(personId, community)
    return community
  } else {
    throw new Error("You don't have permission to modify this community")
  }
}

/**
 * As a moderator, removes member from a community.
 */
export async function removeMember (loggedInUser, userToRemove, communityId) {
  const community = await Community.find(communityId)
  const isModerator = await GroupMembership.hasModeratorRole(loggedInUser, community)
  if (isModerator) {
    await CommunityService.removeMember(userToRemove, communityId, loggedInUser)
    return community
  } else {
    throw new Error("You don't have permission to moderate this community")
  }
}

export async function regenerateAccessCode (userId, communityId) {
  const community = await Community.find(communityId)
  const isModerator = await GroupMembership.hasModeratorRole(userId, community)

  if (!isModerator) {
    throw new Error("You don't have permission to modify this community")
  }

  if (!community) throw new Error('Community not found')
  return Community.getNewAccessCode()
  .then(code => community.save({beta_access_code: code}, {patch: true})) // eslint-disable-line camelcase
}

export function createCommunity (userId, data) {
  return Community.create(userId, data)
  .then(({ community, membership }) => {
    return membership
  })
}
