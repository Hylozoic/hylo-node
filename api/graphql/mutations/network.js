import validateNetworkData from '../../models/network/validateNetworkData'
import underlyingUpdateNetwork from '../../models/network/updateNetwork'
import convertGraphqlData from './convertGraphqlData'

// TODO: more integrated `isAdmin` handling for mutations?
export function networkMutationPermissionCheck ({ userId, isAdmin = false }, networkId) {
  return isAdmin
    ? Promise.resolve()
    : NetworkMembership.hasModeratorRole(userId, networkId)
        .then(ok => {
          if (!ok) throw new Error("You don't have permission to modify this network.")
        })
}

export function addCommunityToNetwork (user, { communityId, networkId }) {
  return networkMutationPermissionCheck(user, networkId)
    .then(() => Community
      .where('id', communityId)
      .save('network_id', networkId, { method: 'update', patch: true }))
    .then(() => Network.find(networkId, { withRelated: [ 'communities' ] }))
}

export function addNetworkModeratorRole (user, { personId, networkId }) {
  return networkMutationPermissionCheck(user, networkId)
    .then(() => NetworkMembership.addModerator(personId, networkId))
    .then(() => Network.find(networkId, { withRelated: [ 'moderators' ] }))
}

export function removeCommunityFromNetwork (user, { communityId, networkId }) {
  return networkMutationPermissionCheck(user)
    .then(() => Community
      .where('id', communityId)
      .save('network_id', null, { method: 'update', patch: true }))
    .then(() => Network.find(networkId, { withRelated: [ 'communities' ] }))
}

export function removeNetworkModeratorRole (user, { personId, networkId }) {
  return networkMutationPermissionCheck(user, networkId)
    .then(() => NetworkMembership
      .where({ user_id: personId, network_id: networkId })
      .destroy())
    .then(() => Network.find(networkId, { withRelated: [ 'moderators' ] }))
}

export function updateNetwork (user, { id, data }) {
  const convertedData = convertGraphqlData(data)
  return networkMutationPermissionCheck(user, id)
  .then(() => validateNetworkData(user.userId, convertedData))
  .then(() => underlyingUpdateNetwork(user.userId, id, convertedData))
}
