module.exports = function isModerator(req, res, next) {
  sails.log.debug("isModerator Policy: ", req.user, req.param('id'));
  Membership.withIds(req.session.user.id, req.param('id'))
  .then(function(membership) {
    if (membership && membership.hasModeratorRole()) {
      next();
    } else {
      sails.log.debug("Fail isModerator policy: " + req.user);
      res.forbidden();
    }
  });
};
