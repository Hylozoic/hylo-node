import validateNetworkData from '../../models/network/validateNetworkData'
import underlyingUpdateNetwork from '../../models/network/updateNetwork'
import convertGraphqlData from './convertGraphqlData'

// TODO: more integrated `isAdmin` handling for mutations?
export async function networkMutationPermissionCheck ({ userId, isAdmin = false }, networkId) {
  if (isAdmin) return
  if (!await NetworkMembership.hasModeratorRole(userId, networkId)) {
    throw new Error("You don't have permission to modify that network.")
  }
}

export async function addCommunityToNetwork (user, { communityId, networkId }) {
  await networkMutationPermissionCheck(user, networkId)
  await Community
    .where('id', communityId)
    .save('network_id', networkId, { method: 'update', patch: true })
  return Network.find(networkId, { withRelated: [ 'communities' ] })
}

export async function addNetworkModeratorRole (user, { personId, networkId }) {
  await networkMutationPermissionCheck(user, networkId)
  if (await NetworkMembership.hasModeratorRole(personId, networkId)) {
    throw new Error('That user already has moderator permissions for that network.')
  }
  await NetworkMembership.addModerator(personId, networkId)
  return Network.find(networkId, { withRelated: [ 'moderators' ] })
}

export async function removeCommunityFromNetwork (user, { communityId, networkId }) {
  await networkMutationPermissionCheck(user, networkId)
  await Community
    .where('id', communityId)
    .save('network_id', null, { method: 'update', patch: true })
  return Network.find(networkId, { withRelated: [ 'communities' ] })
}

export async function removeNetworkModeratorRole (user, { personId, networkId }) {
  await networkMutationPermissionCheck(user, networkId)
  await NetworkMembership
    .where({ user_id: personId, network_id: networkId })
    .destroy()
  return Network.find(networkId, { withRelated: [ 'moderators' ] })
}

export function updateNetwork (user, { id, data }) {
  const convertedData = convertGraphqlData(data)
  return networkMutationPermissionCheck(user, id)
  .then(() => validateNetworkData(user.userId, convertedData))
  .then(() => underlyingUpdateNetwork(user.userId, id, convertedData))
}
