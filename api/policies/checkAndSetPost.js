module.exports = function checkAndSetPost (req, res, next) {
  var postId = req.param('postId')

  var fail = function (log, responseType) {
    sails.log.debug(`policy: checkAndSetPost: ${log}`)
    res[responseType || 'forbidden']()
  }

  return Post.find(postId, {withRelated: 'communities'})
  .then(post => {
    if (!post) return fail(`post ${postId} not found`, 'notFound')

    res.locals.post = post

    var ok = Admin.isSignedIn(req) ||
      (res.locals.publicAccessAllowed && post.isPublic())

    return (ok ? Promise.resolve(true)
      : Post.isVisibleToUser(post.id, req.getUserId()))
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
