/**
 * playSessionCheck
 *
 * @module      :: Policy
 * @description :: Allow any user logged in from Play
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
module.exports = function(req, res, next) {

  var playSession = new PlaySession(req);
  if (playSession.isValid()) {
    playSession.findUser(function(err, user) {
      sails.log.debug("Play session is valid: " + user.email);
      req.session.authenticated = true;
      req.session.user = user || {};
      next();
    });

  } else {
    sails.log.debug("Play session is invalid or absent");
    next();
  }
};
