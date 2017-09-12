import validateNetworkData from '../../models/network/validateNetworkData'
import underlyingUpdateNetwork from '../../models/network/updateNetwork'
import convertGraphqlData from './convertGraphqlData'

export function updateNetwork (userId, { id, data }) {
  return NetworkMembership.hasModeratorRole(userId, id)
  .then(ok => {
    if (!ok) throw new Error("You don't have permission to modify this network")
    const convertedData = convertGraphqlData(data)
    return validateNetworkData(userId, convertedData)
    .then(() => underlyingUpdateNetwork(userId, id, convertedData))
  })
}
