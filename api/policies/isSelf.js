module.exports = function isSelf(req, res, next) {
  if (Admin.isSignedIn(req)) return next();

  if (req.param('userId') == req.session.userId) {
    next();
  } else {
    res.forbidden();
  }
};
