module.exports = function isMember(req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  Membership.find(req.session.userId, req.param('id'))
  .then(function(membership) {
    if (membership) {
      res.locals.membership = membership;
      next();
    } else {
      sails.log.debug("policy: checkAndSetMembership: fail", req.session.userId, req.param('id'));
      res.forbidden();
    }
  });
};
