module.exports = function isMember(req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  Post.find(req.param('id')).then(function(post) {
    if (post) {
      res.locals.post = post;
      next();
    } else {
      sails.log.debug("Fail checkAndSetPost policy", req.session.user.id, req.param('id'));
      res.forbidden();
    }
  });
};
