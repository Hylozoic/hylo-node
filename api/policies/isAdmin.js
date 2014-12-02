module.exports = function(req, res, next) {

  if (req.user && (req.user.email || '').match(/@hylo\.com$/)) {
    sails.log.debug('isAdmin: ' + req.user.email)
    next();
  } else {
    res.forbidden();
  }
};
