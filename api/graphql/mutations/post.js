import validatePostData from '../../models/post/validatePostData'
import underlyingCreatePost from '../../models/post/createPost'
import underlyingUpdatePost from '../../models/post/updatePost'

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

export function fulfillPost (userId, postId) {
  return Post.find(postId)
    .then(post => {
      if (post.get('user_id') !== userId) {
        throw new Error("You don't have permission to modify this post")
      }
      return post.fulfill()
    })
    .then(() => ({success: true}))
}

export function unfulfillPost (userId, postId) {
  return Post.find(postId)
    .then(post => {
      if (post.get('user_id') !== userId) {
        throw new Error("You don't have permission to modify this post")
      }
      return post.unfulfill()
    })
    .then(() => ({success: true}))
}

export function vote (userId, postId, isUpvote) {
  return Post.find(postId)
  .then(post => post.vote(userId, isUpvote))
}

export function deletePost (userId, postId) {
  return Post.find(postId)
  .then(post => {
    if (post.get('user_id') !== userId) {
      throw new Error("You don't have permission to modify this post")
    }
    return Post.deactivate(postId)
  })
  .then(() => ({success: true}))
}

export async function pinPost (userId, postId, groupId) {
  const group = await Group.find(groupId)
  return GroupMembership.hasModeratorRole(userId, group)
  .then(isModerator => {
    if (!isModerator) throw new Error("You don't have permission to modify this group")
    return PostMembership.find(postId, groupId)
    .then(postMembership => {
      if (!postMembership) throw new Error("Couldn't find postMembership")
      return postMembership.togglePinned()
    })
    .then(() => ({success: true}))
  })
}

// converts input data from the way it's received in GraphQL to the format that
// the legacy code expects -- this sort of thing can be removed/refactored once
// hylo-redux is no longer in use
function convertGraphqlPostData (data) {
  return Promise.resolve(Object.assign({
    name: data.title,
    description: data.details,
    link_preview_id: data.linkPreviewId,
    group_ids: data.groupIds,
    parent_post_id: data.parentPostId,
    location_id: data.locationId,
    location: data.location,
    is_public: data.isPublic
  }, data))
}
