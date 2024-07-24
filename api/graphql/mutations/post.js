const { GraphQLYogaError } = require('@graphql-yoga/node')

import validatePostData from '../../models/post/validatePostData'
import underlyingCreatePost from '../../models/post/createPost'
import underlyingUpdatePost from '../../models/post/updatePost'

export function createPost (userId, data) {
  return convertGraphqlPostData(data)
  .tap(convertedData => validatePostData(userId, convertedData))
  .then(validatedData => underlyingCreatePost(userId, validatedData))
}

export function deletePost (userId, postId) {
  return Post.find(postId)
  .then(post => {
    if (!post) {
      throw new GraphQLYogaError("Post does not exist")
    }
    if (post.get('user_id') !== userId) {
      throw new GraphQLYogaError("You don't have permission to modify this post")
    }
    return Post.deactivate(postId)
  })
  .then(() => ({success: true}))
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
        throw new GraphQLYogaError("You don't have permission to modify this post")
      }
      return post.fulfill()
    })
    .then(() => ({success: true}))
}

export function unfulfillPost (userId, postId) {
  return Post.find(postId)
    .then(post => {
      if (post.get('user_id') !== userId) {
        throw new GraphQLYogaError("You don't have permission to modify this post")
      }
      return post.unfulfill()
    })
    .then(() => ({success: true}))
}

export async function addProposalVote ({ userId, postId, optionId }) {
  if (!userId || !postId || !optionId) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, optionId })}`)

  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to vote on this post")

  return Post.find(postId)
    .then(async post => {
      if (post.get('proposal_status') !== Post.Proposal_Status.VOTING && post.get('proposal_status') !== Post.Proposal_Status.CASUAL) throw new GraphQLYogaError('Cannot vote on a proposal that is in discussion or completed')
      await post.addFollowers([userId])
      return post.addProposalVote({ userId, optionId })
    })
    .catch((err) => { throw new GraphQLYogaError(`adding of vote failed: ${err}`) })
    .then(() => ({ success: true }))
}

export async function removeProposalVote ({ userId, postId, optionId }) {
  if (!userId || !postId || !optionId) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, optionId })}`)

  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to vote on this post")
  return Post.find(postId)
    .then(post => {
      if (post.get('proposal_status') !== Post.Proposal_Status.VOTING && post.get('proposal_status') !== Post.Proposal_Status.CASUAL) throw new GraphQLYogaError('Cannot vote on a proposal that is in discussion or completed')
      return post.removeProposalVote({ userId, optionId })
    })
    .catch((err) => { throw new GraphQLYogaError(`removal of vote failed: ${err}`) })
    .then(() => ({ success: true }))
}

export async function setProposalOptions ({ userId, postId, options }) {
  console.log('entering setProposalOptions')
  if (!userId || !postId || !options) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, options })}`)
  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to modify this post")
  return Post.find(postId)
    .then(post => {
      if (post.get('proposal_status') !== Post.Proposal_Status.DISCUSSION) throw new GraphQLYogaError("Proposal options cannot be changed unless the proposal is in 'discussion'")
      console.log('setting options')
        return post.setProposalOptions({ options })
    })
    .catch((err) => { throw new GraphQLYogaError(`setting of options failed: ${err}`) })
    .then(() => ({ success: true }))
}

export async function updateProposalOptions ({ userId, postId, options }) {
  if (!userId || !postId || !options) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, options })}`)
  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to modify this post")
  return Post.find(postId)
    .then(post => {
      if (post.get('proposal_status') === Post.Proposal_Status.COMPLETED && post.get('proposal_status') !== Post.Proposal_Status.CASUAL) throw new GraphQLYogaError("Proposal options cannot be changed once a proposal is complete'")
      return post.updateProposalOptions({ options, userId })
    })
    .catch((err) => { throw new GraphQLYogaError(`setting of options failed: ${err}`) })
    .then(() => ({ success: true }))
}

export async function swapProposalVote ({ userId, postId, removeOptionId, addOptionId }) {
  if (!userId || !postId || !removeOptionId || !addOptionId) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, removeOptionId, addOptionId })}`)
  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to vote on this post")
  if (removeOptionId === addOptionId) throw new GraphQLYogaError('You cannot swap a vote for the same option')

  const post = await Post.find(postId)
  if (!post) throw new GraphQLYogaError(`Couldn't find post for ${postId}`)
  if (post.get('proposal_status') !== Post.Proposal_Status.VOTING && post.get('proposal_status') !== Post.Proposal_Status.CASUAL) throw new GraphQLYogaError('Cannot vote on a proposal that is in discussion or completed')

  try {
    await post.removeProposalVote({ userId, optionId: removeOptionId })
    await post.addProposalVote({ userId, optionId: addOptionId })
    return { success: true }
  } catch (err) {
    throw new GraphQLYogaError(`swap of vote failed: ${err}`)
  }
}

export function updateProposalOutcome ({ userId, postId, proposalOutcome }) {
  return Post.find(postId)
    .then(post => {
      if (post.get('user_id') !== userId) {
        throw new GraphQLYogaError("You don't have permission to modify this post")
      }
      return post.updateProposalOutcome(proposalOutcome)
    })
    .then(() => ({ success: true }))
}

export async function pinPost (userId, postId, groupId) {
  const group = await Group.find(groupId)
  return GroupMembership.hasResponsibility(userId, group, Responsibility.constants.RESP_MANAGE_CONTENT)
  .then(isModerator => {
    if (!isModerator) throw new GraphQLYogaError("You don't have permission to modify this group")
    return PostMembership.find(postId, groupId)
    .then(postMembership => {
      if (!postMembership) throw new GraphQLYogaError("Couldn't find postMembership")
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
    link_preview_featured: data.linkPreviewFeatured,
    group_ids: data.groupIds,
    parent_post_id: data.parentPostId,
    location_id: data.locationId,
    location: data.location,
    is_public: data.isPublic
  }, data))
}
