module.exports = function checkAndSetCommentable (req, res, next) {
  const postId = req.param('postId')
  const commentId = req.param('commentId')

  var fail = function (log, responseType) {
    sails.log.debug(`policy: checkAndSetCommentable: ${log}`)
    res[responseType || 'forbidden']()
  }

  if (postId && commentId) return Promise.resolve(fail('postId and commentId both set', 'badRequest'))

  const postAndCommentPromise = commentId
  ? Comment.find(commentId)
    .then(comment => {
      if (!comment) return fail(`comment ${commentId} not found`, 'notFound')
      return comment.parentPost()
      .then(post => Promise.join(post.load('communities'), comment))
    })
  : Promise.join(Post.find(postId, {withRelated: 'communities'}), null)

  return postAndCommentPromise
  .then(([post, comment]) => {
    if (!post) return fail(`post ${postId} not found`, 'notFound')

    if (comment) {
      res.locals.commentable = comment
    } else {
      res.locals.commentable = post
    }

    var ok = Admin.isSignedIn(req) ||
      (res.locals.publicAccessAllowed && post.isPublic())

    return (ok ? Promise.resolve(true)
      : Post.isVisibleToUser(post.id, req.session.userId))
    .then(allowed => {
      if (allowed) {
        next()
      } else {
        fail('not allowed')
      }
      return null
    })
  })
  .catch(err => fail(err.message, 'serverError'))
}
