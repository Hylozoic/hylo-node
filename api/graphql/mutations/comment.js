import underlyingDeleteComment from '../../models/comment/deleteComment'

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
