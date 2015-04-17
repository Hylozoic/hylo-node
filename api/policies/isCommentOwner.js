module.exports = function isCommentOwner(req, res, next) {

  if (Admin.isSignedIn(req))
    return next();

  if (!req.param('commentId'))
    return forbidden();

  Comment.find(req.param('commentId'), {withRelated: [
    {'post.communities': function(qb) { qb.column('id'); }}
  ]}).then(function(comment) {
    if (comment.get('user_id') === req.session.userId)
      return next();

    Membership.hasModeratorRole(req.session.userId, comment.community().id).then(function(isModerator) {
      if (isModerator) {
        next();
      } else {
        sails.log.debug("policy: isCommentOwner: fail for user " + req.session.userId);
        res.forbidden();
      }
    });
  });
};
