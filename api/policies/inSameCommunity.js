module.exports = function isSelf(req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  Membership.inSameCommunity([req.session.user.id, req.param('id')])
    .then(function(inSameCommunity) {
      inSameCommunity ? next() : res.forbidden();
    });
};
