module.exports = function isModerator(req, res, next) {
  if (Admin.isSignedIn(req)) return next();
  Membership.find(req.session.userId, req.param('communityId'))
  .then(function(membership) {
    if (membership && membership.hasModeratorRole()) {
      next();
    } else {
      sails.log.debug("policy: isModerator: fail for user " + req.session.userId + ", community " + req.param('communityId'));
      res.forbidden();
    }
  });
};
