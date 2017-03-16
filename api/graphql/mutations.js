import {
  convertGraphqlCreateData,
  createPost as underlyingCreatePost,
  validateGraphqlCreateData
} from '../models/post/util'

export const updateMe = (userId, changes) =>
  User.find(userId)
    .then(user => user.validateAndSave(changes))

export const createPost = (userId, data) =>
  validateGraphqlCreateData(data)
    .then(() => convertGraphqlCreateData(data))
    .then(convertedData => underlyingCreatePost(userId, convertedData))
