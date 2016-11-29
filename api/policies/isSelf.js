module.exports = function isSelf (req, res, next) {
  if (Admin.isSignedIn(req)) return next()

  if (!req.param('userId') || req.param('userId') === req.getUserId()) {
    next()
  } else {
    res.forbidden()
  }
}
