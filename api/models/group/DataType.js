const POST = 0
const COMMUNITY = 1
const NETWORK = 2
const TOPIC = 3
const COMMENT = 4
const COMMUNITY_AND_TOPIC = 5

const GroupDataType = {
  POST,
  COMMUNITY,
  NETWORK,
  TOPIC,
  COMMENT,
  COMMUNITY_AND_TOPIC
}

export default GroupDataType

export function getModelForDataType (dataType) {
  switch (dataType) {
    case POST: return Post
    case COMMUNITY: return Group
    case NETWORK: return Group
    case TOPIC: return Tag
    case COMMENT: return Comment
  }
}

export function getDataTypeForInstance (instance) {
  if (instance instanceof Post) return POST
  if (instance instanceof Community) return COMMUNITY
  if (instance instanceof Network) return NETWORK
  if (instance instanceof Tag) return TOPIC
  if (instance instanceof Comment) return COMMENT
}

export function getDataTypeForModel (model) {
  return getDataTypeForInstance(model.forge())
}
