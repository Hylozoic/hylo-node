import { merge } from 'lodash'
import {
  createComment as underlyingCreateComment,
  validateCommentCreateData
} from '../models/comment/createAndPresentComment'
import {
  createPost as underlyingCreatePost,
  findOrCreateThread as underlyingFindOrCreateThread,
  validatePostCreateData,
  validateThreadData
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

export function createComment (userId, data) {
  return validateCommentCreateData(userId, data)
  .then(() => Promise.props({
    post: Post.find(data.postId),
    parentComment: data.parentCommentId ? Comment.find(data.parentCommentId) : null
  }))
  .then(extraData => underlyingCreateComment(userId, merge(data, extraData)))
}

export function findOrCreateThread (userId, data) {
  return validateThreadData(userId, data)
  .then(() => underlyingFindOrCreateThread(userId, data.participantIds))
}
