/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */

// if you change the keys that are added to the session below,
// change this version number. it will cause existing sessions
// to get updated.
//
// note that if you want to delete a key from existing sessions,
// you'll have to add "delete req.session.foo"
//
var sessionDataVersion = '2';

module.exports = function(req, res, next) {

  if (req.session.authenticated && req.session.version == sessionDataVersion) {
    next();
  } else {
    var playSession = new PlaySession(req);
    if (playSession.isValid()) {
      playSession.fetchUser().then(function(user) {
        if (user) {
          sails.log.debug("policy: sessionAuth: validated as " + user.get('email'));

          req.session.authenticated = true;
          req.session.userId = user.id;
          req.session.userProvider = playSession.providerKey();
          req.rollbar_person = user.pick('id', 'name', 'email');
          req.session.version = sessionDataVersion;
          next();
        } else {
          sails.log.debug("policy: sessionAuth: fail (valid session but no user!?)");
          res.forbidden();
        }
      });
    } else {
      // User is not allowed
      // (default res.forbidden() behavior can be overridden in `config/403.js`)
      sails.log.debug("policy: sessionAuth: fail");
      res.forbidden();
    }
  }
};
