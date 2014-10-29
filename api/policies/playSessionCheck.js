/**
 * playSessionCheck
 *
 * @module      :: Policy
 * @description :: Allow any user logged in from Play
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
module.exports = function(req, res, next) {

  if (new PlaySession(req).isValid()) {
    sails.log.debug("checking Play session cookie... OK");
    req.session.authenticated = true;
  } else {
    sails.log.debug("checking Play session cookie... NO");
  }

  return next();
};
