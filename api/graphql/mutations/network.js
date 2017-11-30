import validateNetworkData from '../../models/network/validateNetworkData'
import underlyingUpdateNetwork from '../../models/network/updateNetwork'
import convertGraphqlData from './convertGraphqlData'

export function addCommunityToNetwork (userId, { communityId, networkId }) {
  return NetworkMembership.hasModeratorRole(userId, networkId)
    .then(ok => {
      if (!ok) throw new Error("You don't have permission to modify this network.")
    })
    .then(() => true)
}

export function addNetworkModeratorRole (userId, { personId, networkId }) {
  return NetworkMembership.hasModeratorRole(userId, networkId)
    .then(ok => {
      if (!ok) throw new Error("You don't have permission to modify this network.")
    })
    .then(() => NetworkMembership.addModerator(personId, networkId))
    .then(() => Network.find(networkId))
}

export function removeCommunityFromNetwork (userId, { communityId, networkId }) {
  return NetworkMembership.hasModeratorRole(userId, networkId)
    .then(ok => {
      if (!ok) throw new Error("You don't have permission to modify this network.")
    })
    .then(() => true)
}

export function removeNetworkModeratorRole (userId, { personId, networkId }) {
  return NetworkMembership.hasModeratorRole(userId, networkId)
    .then(ok => {
      if (!ok) throw new Error("You don't have permission to modify this network.")
    })
    .then(() => NetworkMembership
      .where({ user_id: userId, network_id: networkId })
      .delete())
    .then(() => Network.find(networkId))
}

export function updateNetwork (userId, { id, data }) {
  const convertedData = convertGraphqlData(data)
  return NetworkMembership.hasModeratorRole(userId, id)
  .then(ok => {
    if (!ok) throw new Error("You don't have permission to modify this network")
  })
  .then(() => validateNetworkData(userId, convertedData))
  .then(() => underlyingUpdateNetwork(userId, id, convertedData))
}
