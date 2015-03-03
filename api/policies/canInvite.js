module.exports = function canInvite(req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  Community.canInvite(req.session.userId, req.param('communityId'))
  .then(function(canInvite) {
    if (canInvite) {
      next();
    } else {
      sails.log.debug("policy: canInvite: fail for user " + req.session.userId + ", community " + req.param('communityId'));
      res.forbidden();
    }
  });
};
