import { isEmpty } from 'lodash'

export default function validateNetworkData (userId, data) {
  if (!data.name) {
    throw new Error('title can\'t be blank')
  }
}
