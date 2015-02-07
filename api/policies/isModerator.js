module.exports = function isModerator(req, res, next) {
  if (Admin.isSignedIn(req)) return next();
  Membership.hasModeratorRole(req.session.userId, req.param('communityId'))
  .then(function(isModerator) {
    if (isModerator) {
      next();
    } else {
      sails.log.debug("policy: isModerator: fail for user " + req.session.userId + ", community " + req.param('communityId'));
      res.forbidden();
    }
  });
};
