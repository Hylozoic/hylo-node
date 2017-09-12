import CommunityService from '../../services/CommunityService'
import convertGraphqlData from './convertGraphqlData'

export function updateCommunitySettings (userId, communityId, changes) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      return Community.find(communityId)
      .then(community => community.update(convertGraphqlData(changes)))
    } else {
      throw new Error("you don't have permission to modify this community")
    }
  })
}

export function addModerator (userId, personId, communityId) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      return Membership.setModeratorRole(personId, communityId)
      .then(() => Community.find(communityId))
    } else {
      throw new Error("You don't have permission to modify this community")
    }
  })
}

export function removeModerator (userId, personId, communityId) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      return Membership.removeModeratorRole(personId, communityId)
      .then(() => Community.find(communityId))
    } else {
      throw new Error("You don't have permission to modify this community")
    }
  })
}

/**
 * As a moderator, removes member from a community.
 */
export function removeMember (loggedInUser, userToRemove, communityId) {
  return Membership.hasModeratorRole(loggedInUser, communityId)
    .then(isModerator => {
      if (isModerator) {
        return CommunityService.removeMember(userToRemove, communityId, loggedInUser)
          .then(() => Community.find(communityId))
      } else {
        throw new Error("You don't have permission to moderate this community")
      }
    })
}

export function regenerateAccessCode (userId, communityId) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(ok => {
    if (!ok) {
      throw new Error("You don't have permission to modify this community")
    }
  })
  .then(() => Community.find(communityId))
  .then(community => {
    if (!community) throw new Error('Community not found')
    return Community.getNewAccessCode()
    .then(code => community.save({beta_access_code: code}, {patch: true})) // eslint-disable-line camelcase
  })
}

export function createCommunity (userId, data) {
  return Community.create(userId, data)
  .then(({ community, membership }) => {
    return membership
  })
}
