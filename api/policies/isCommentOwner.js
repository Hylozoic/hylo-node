module.exports = function isCommentOwner(req, res, next) {

  if (Admin.isSignedIn(req))
    return next();

  if (!req.param('commentId'))
    return forbidden();

  Comment.find(req.param('commentId')).then(function(comment) {
    if (comment.get('user_id') === req.session.userId) {
      next();
    } else {
      sails.log.debug("policy: isOwner: fail for user " + req.session.userId);
      res.forbidden();
    }
  });
};
