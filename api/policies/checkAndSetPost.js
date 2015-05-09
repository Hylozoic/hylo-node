module.exports = function checkAndSetPost(req, res, next) {
  return Post.find(req.param('postId'))
  .tap(function(post) {
    if (!post) throw new Error(format('Post %s not found', req.param('postId')));
  })
  .then(function(post) {
    res.locals.post = post;

    if (Admin.isSignedIn(req))
      return Promise.resolve(true);

    if (res.locals.publicAccessAllowed && post.isPublicReadable())
      return Promise.resolve(true);

    return Post.isVisibleToUser(post.id, req.session.userId);
  })
  .then(function(allowed) {
    if (allowed) {
      next();
    } else {
      sails.log.debug(format("Fail checkAndSetPost policy: uId:%s postId:%s", req.session.userId, req.param('postId')));
      res.forbidden();
    }
  })
  .catch(function(err) {
    sails.log.debug(format("Fail checkAndSetPost policy %s %s: %s", req.session.userId, req.param('postId'), err.message));
    res.forbidden();
  });
};
