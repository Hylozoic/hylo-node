import validateNetworkData from '../../models/network/validateNetworkData'
import underlyingUpdateNetwork from '../../models/network/updateNetwork'
import convertGraphqlData from './convertGraphqlData'

export function updateNetwork (userId, { id, data }) {
  const convertedData = convertGraphqlData(data)
  return validateNetworkData(userId, convertedData)
  .then(() => underlyingUpdateNetwork(userId, id, convertedData))
}
