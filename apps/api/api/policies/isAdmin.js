module.exports = function(req, res, next) {
  if (Admin.isSignedIn(req)) {
    sails.log.debug('isAdmin: ' + req.user.email);
    return next()
  } else {
    if (res.forbidden) {
      res.forbidden()
    } else {
      // when this middleware is used outside of the Sails stack
      // (see http.js), it needs to fall back to the standard API
      // for http.ServerResponse
      res.statusCode = 403;
      res.end('Forbidden')
    }
  }
};
