import { merge } from 'lodash'
import {
  createPost as underlyingCreatePost,
  validatePostCreateData
} from '../models/post/util'

export function updateMe (userId, changes) {
  return User.find(userId)
  .then(user => user.validateAndSave(changes))
}

function convertGraphqlCreateData (data) {
  return Promise.resolve(merge({
    name: data.title,
    description: data.details,
    community_ids: data.communityIds,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    parent_post_id: data.parentPostId
  }, data))
}

export function createPost (userId, data) {
  return convertGraphqlCreateData(data)
  .tap(convertedData => validatePostCreateData(userId, convertedData))
  .then(convertedData => underlyingCreatePost(userId, convertedData))
}
