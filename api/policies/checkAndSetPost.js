module.exports = function checkAndSetPost(req, res, next) {
  // TODO check that the post is in a community the user belongs to,
  // or bypass for admins (but still set res.locals.post)

  Post.find(req.param('postId')).then(function(post) {
    if (post) {
      res.locals.post = post;
      next();
    } else {
      sails.log.debug("Fail checkAndSetPost policy", req.session.userId, req.param('postId'));
      res.forbidden();
    }
  });
};
