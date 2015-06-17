module.exports = function (req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  if (req.session.userId === req.param('userId')) return next();

  Membership.inSameCommunity([req.session.userId, req.param('userId')])
    .then(same => {
      if (same) return next();

      Membership.inSameNetwork(req.session.userId, req.param('userId'))
      .then(same => (same ? next() : res.forbidden()));
    })
    .catch(res.serverError);
};
