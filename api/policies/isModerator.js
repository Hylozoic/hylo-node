module.exports = function isModerator(req, res, next) {
  Membership.withIds(req.session.user.id, req.param('id'))
  .then(function(membership) {
    if (membership && membership.hasModeratorRole()) {
      next();
    } else {
      res.forbidden();
    }
  });
};
