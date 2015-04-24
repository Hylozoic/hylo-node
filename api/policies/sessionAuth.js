/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */

var fail = function(res) {
  sails.log.debug("policy: sessionAuth: fail");

  // sending Unauthorized instead of Forbidden so that this triggers
  // http-auth-interceptor in the Angular app
  res.status(401);
  res.send('Unauthorized');
};

var tryPublic = function(res, next) {
  if (res.locals.publicAccessAllowed) {
    sails.log.debug("policy: sessionAuth: publicAccessAllowed");
    return next();
  }

  fail(res);
};

module.exports = function(req, res, next) {
  if (TokenAuth.isAuthenticated(res)) {
    sails.log.debug("policy: sessionAuth: validated by token");
    return next();
  } else if (UserSession.isLoggedIn(req)) {
    return next();
  }

  tryPublic(res, next);
};
