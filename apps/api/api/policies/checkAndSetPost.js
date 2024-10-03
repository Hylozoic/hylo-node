module.exports = function checkAndSetPost (req, res, next) {
  var postId = req.param('postId')

  var fail = function (log, responseType, err) {
    sails.log.debug(`policy: checkAndSetPost: ${log}`)
    res[responseType || 'forbidden'](err)
  }

  if (isNaN(Number(postId))) {
    return fail(`post id "${postId}" is invalid`, 'badRequest')
  }

  return Post.find(postId, {withRelated: 'groups'})
  .then(post => {
    if (!post) return fail(`post ${postId} not found`, 'notFound')

    res.locals.post = post

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
  .catch(err => fail(err.message, 'serverError', err))
}
