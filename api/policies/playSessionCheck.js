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
    sails.log.info("authenticated via Play session");
    req.session.authenticated = true;
  }

  return next();
};
