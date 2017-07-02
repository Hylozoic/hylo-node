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
import underlyingFindLinkPreview from '../models/linkPreview/findOrCreateByUrl'

function convertGraphqlData (data) {
  return transform(data, (result, value, key) => {
    result[snakeCase(key)] = typeof value === 'object'
      ? convertGraphqlData(value)
      : value
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
    link_preview_id: data.linkPreviewId,
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

export function findOrCreateLinkPreviewByUrl (data) {
  return underlyingFindLinkPreview(data.url)
}

export function vote (userId, postId, isUpvote) {
  return Post.find(postId)
  .then(post => post.vote(userId, isUpvote))
}

export function subscribe (userId, topicId, communityId, isSubscribing) {
  return TagFollow.subscribe(topicId, userId, communityId, isSubscribing)
}

export function updateMembership (userId, { communityId, data }) {
  const settings = convertGraphqlData(data.settings)
  const whitelist = mapKeys(pick(data, [
    'newPostCount',
    'lastViewedAt'
  ]), (v, k) => snakeCase(k))
  if (isEmpty(whitelist) && isEmpty(settings)) return Promise.resolve(null)

  return Membership.find(userId, communityId)
  .then(membership => {
    if (!membership) throw new Error("Couldn't find membership for community with id", communityId)

    return isEmpty(settings)
      ? Promise.resolve(membership)
      : membership.addSetting(settings)
  })
  .then(membership =>
    // if settings is not empty, it saves the membership anyway as settings have
    // been added above
    isEmpty(whitelist) && isEmpty(settings)
      ? Promise.resolve(membership)
      : membership.save(whitelist))
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

export function deletePost (userId, postId) {
  return Post.find(postId)
  .then(post => {
    if (post.get('user_id') !== userId) {
      throw new Error("you don't have permission to modify this post")
    }
    return Post.deactivate(postId)
  })
  .then(() => ({success: true}))
}
