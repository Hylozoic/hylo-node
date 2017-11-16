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

export function pinPost (userId, postId, communityId) {
  return Membership.hasModeratorRole(userId, communityId)
  .then(isModerator => {
    if (!isModerator) throw new Error("You don't have permission to modify this community")
    return PostMembership.find(postId, communityId)
    .then(postMembership => {
      if (!postMembership) throw new Error("Couldn't find postMembership")

      return postMembership.save({pinned: !postMembership.get('pinned')})
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
    community_ids: data.communityIds,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    parent_post_id: data.parentPostId
  }, data))
}
