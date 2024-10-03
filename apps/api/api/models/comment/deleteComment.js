export default function deleteComment (comment, userId) {
  return bookshelf.transaction(trx => Promise.join(
    Activity.removeForComment(comment.id, trx),

    Post.query().where('id', comment.get('post_id'))
    .decrement('num_comments', 1).transacting(trx),

    Post.find(comment.get('post_id'))
    .then(post => Tag.updateForPost(post, null, null, null, trx)),

    comment.save({
      deactivated_by_id: userId,
      deactivated_at: new Date(),
      active: false,
      recent: false
    }, {patch: true})
    .tap(c =>
      Queue.classMethod('Post', 'updateFromNewComment', {postId: c.get('post_id')}))))
}
