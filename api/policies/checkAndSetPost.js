var format = require('util').format;

module.exports = function checkAndSetPost(req, res, next) {
  return Post.find(req.param('postId'))
  .tap(function(post) {
    if (!post) throw new Error(format('Seed %s not found', req.param('postId')));
  })
  .then(function(post) {
    res.locals.post = post;

    // Perform any checks against viewing this post
    return Promise.all([
      Admin.isSignedIn(req),
      Post.isVisibleToUser(post.id, req.session.userId)
    ]);
  })
  .then(function(allowed) {
    if (_.any(allowed, Boolean)) {
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
