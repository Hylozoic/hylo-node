import { isEmpty, merge, mapKeys, pick, transform, snakeCase } from 'lodash'
import {
  createComment as underlyingCreateComment,
  validateCommentCreateData
} from '../models/comment/createAndPresentComment'
import validatePostData from '../models/post/validatePostData'
import underlyingCreatePost from '../models/post/createPost'
import underlyingUpdatePost from '../models/post/updatePost'
import underlyingFindOrCreateThread, {
  validateThreadData
} from '../models/post/findOrCreateThread'

function convertGraphqlData (data) {
  return transform(data, (result, value, key) => {
    result[snakeCase(key)] = value
  }, {})
}

export function updateMe (userId, changes) {
  return User.find(userId)
  .then(user => user.validateAndSave(convertGraphqlData(changes)))
}

export function leaveCommunity (userId, communityId) {
  return User.find(userId)
  .then(user => user.leaveCommunity(communityId))
}

function convertGraphqlPostData (data) {
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
  return convertGraphqlPostData(data)
  .tap(convertedData => validatePostData(userId, convertedData))
  .then(validatedData => underlyingCreatePost(userId, validatedData))
}

export function updatePost (userId, { id, data }) {
  return convertGraphqlPostData(data)
  .tap(convertedData => validatePostData(userId, convertedData))
  .then(validatedData => underlyingUpdatePost(userId, id, validatedData))
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

export function vote (userId, postId, isUpvote) {
  return Post.find(postId)
  .then(post => post.vote(userId, isUpvote))
}

export function subscribe (userId, topicId, communityId, isSubscribing) {
  return TagFollow.subscribe(topicId, userId, communityId, isSubscribing)
}

export function updateMembership (userId, { id, data }) {
  const whitelist = mapKeys(pick(data, [
    'newPostCount',
    'lastViewedAt'
  ]), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return Membership.query().where({id, user_id: userId})
  .update(whitelist)
  .then(() => ({success: true}))
}

export function updateCommunityTopic (userId, { id, data }) {
  const whitelist = mapKeys(pick(data, 'newPostCount'), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return CommunityTag.where({id}).fetch()
  .then(ct => ct.tagFollow(userId).query().update(whitelist))
  .then(() => ({success: true}))
}

export function markActivityRead (userId, activityid) {
  return Activity.find(activityid)
  .then(a => {
    if (a.get('reader_id') !== userId) return
    return a.save({unread: false})
  })
}

export function markAllActivitiesRead (userId) {
  return Activity.query().where('reader_id', userId).update({unread: false})
  .then(() => ({success: true}))
}

export function unlinkAccount (userId, provider) {
  return User.find(userId)
  .then(user => {
    if (!user) throw new Error(`Couldn't find user with id ${userId}`)
    return user.unlinkAccount(provider)
  })
  .then(() => ({success: true}))
}

export function updateCommunitySettings (userId, communityId, changes) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      return Community.find(communityId)
      .then(community => community.update(convertGraphqlData(changes)))
    } else {
      throw new Error("you don't have permission to modify this community")
    }
  })
}

export function addModerator (userId, personId, communityId) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      return Membership.setModeratorRole(personId, communityId)
      .then(() => Community.find(communityId))
    } else {
      throw new Error("you don't have permission to modify this community")
    }
  })
}

export function removeModerator (userId, personId, communityId) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      return Membership.removeModeratorRole(personId, communityId)
      .then(() => Community.find(communityId))
    } else {
      throw new Error("you don't have permission to modify this community")
    }
  })
}
