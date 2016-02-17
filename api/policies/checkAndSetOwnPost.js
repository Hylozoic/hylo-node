module.exports = function checkAndSetOwnPost(req, res, next) {
  return Post.find(req.param('postId'))
  .tap(function(post) {
    if (!post) throw new Error(format('Post %s not found', req.param('postId')));
  })
  .then(function(post) {
    res.locals.post = post;

    // Perform any checks against viewing this post
    return Promise.all([
      Admin.isSignedIn(req),
      post.get('user_id') == req.session.userId
    ]);
  })
  .then(function(allowed) {
    if (_.some(allowed, Boolean)) {
      next();
    } else {
      sails.log.debug(format("Fail checkAndSetOwnPost policy: uId:%s postId:%s", req.session.userId, req.param('postId')));
      res.forbidden();
    }
  })
  .catch(function(err) {
    sails.log.debug(format("Fail checkAndSetOwnPost policy %s %s: %s", req.session.userId, req.param('postId'), err.message));
    res.forbidden();
  });
};
