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

export async function addCommunityToNetwork (authZ, { communityId, networkId }) {
  await networkMutationPermissionCheck(authZ, networkId)
  await Community
    .where('id', communityId)
    .save('network_id', networkId, { method: 'update', patch: true })
  return Network.find(networkId, { withRelated: [ 'communities' ] })
}

export async function addNetworkModeratorRole (authZ, { personId, networkId }) {
  await networkMutationPermissionCheck(authZ, networkId)
  const hasModeratorRole = await NetworkMembership.hasModeratorRole(personId, networkId)
  if (hasModeratorRole) {
    throw new Error('That user already has moderator permissions for that network.')
  }
  await NetworkMembership.addModerator(personId, networkId)
  return Network.find(networkId, { withRelated: [ 'moderators' ] })
}

export async function removeCommunityFromNetwork (authZ, { communityId, networkId }) {
  await networkMutationPermissionCheck(authZ, networkId)
  await Community
    .where('id', communityId)
    .save('network_id', null, { method: 'update', patch: true })
  return Network.find(networkId, { withRelated: [ 'communities' ] })
}

export async function removeNetworkModeratorRole (authZ, { personId, networkId }) {
  await networkMutationPermissionCheck(authZ, networkId)
  await NetworkMembership
    .where({ user_id: personId, network_id: networkId })
    .destroy()
  return Network.find(networkId, { withRelated: [ 'moderators' ] })
}

export function updateNetwork (authZ, { id, data }) {
  const convertedData = convertGraphqlData(data)
  return networkMutationPermissionCheck(authZ, id)
  .then(() => validateNetworkData(authZ.userId, convertedData))
  .then(() => underlyingUpdateNetwork(authZ.userId, id, convertedData))
}
