module.exports = function(req, res, next) {
  if (Admin.isSignedIn(req)) {
    sails.log.debug('isAdmin: ' + req.user.email)
    next();
  } else {
    res.forbidden();
  }
};
