module.exports = function isMember(req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  Membership.find(req.session.user.id, req.param('id'))
  .then(function(membership) {
    if (membership) {
      next();
    } else {
      sails.log.debug("Fail isMember policy", req.session.user.id, req.param('id'));
      res.forbidden();
    }
  });
};
