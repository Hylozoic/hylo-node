import underlyingDeleteComment from '../../models/comment/deleteComment'
import {
  createComment as underlyingCreateComment
} from '../../models/comment/createAndPresentComment'
import { merge } from 'lodash'

export function canDeleteComment (userId, comment) {
  if (comment.get('user_id') === userId) return Promise.resolve(true)
  return comment.load('post.communities')
  .then(comment => Promise.any(
    comment.relations.post.relations.communities.map(c =>
      Membership.hasModeratorRole(userId, c.id))
  ))
}

export function deleteComment (userId, commentId) {
  return Comment.find(commentId)
  .then(comment => canDeleteComment(userId, comment)
    .then(canDelete => {
      if (!canDelete) throw new Error("You don't have permission to delete this comment")
      return underlyingDeleteComment(comment, userId)
    }))
  .then(() => ({success: true}))
}

export function createComment (userId, data) {
  return validateCommentCreateData(userId, data)
  .then(() => Promise.props({
    post: Post.find(data.postId),
    parentComment: data.parentCommentId ? Comment.find(data.parentCommentId) : null
  }))
  .then(extraData => underlyingCreateComment(userId, merge(data, extraData)))
}

export function validateCommentCreateData (userId, data) {
  return Post.isVisibleToUser(data.postId, userId)
  .then(isVisible => {
    if (isVisible) {
      return Promise.resolve()
    } else {
      throw new Error('post not found')
    }
  })
}
