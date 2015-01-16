/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
module.exports = function(req, res, next) {

  // User is allowed, proceed to the next policy,
  // or if this is the last policy, the controller
  if (req.session.authenticated) {
    next();
  } else {
    var playSession = new PlaySession(req);
    if (playSession.isValid()) {
      playSession.fetchUser().then(function(user) {
        if (user) {
          sails.log.debug("policy: sessionAuth: validated as " + user.get('email'));
          req.session.authenticated = true;
          req.session.userId = user.id;

          req.rollbar_person = user.pick('id', 'name', 'email');
        }
        next();
      });
    } else {
      // User is not allowed
      // (default res.forbidden() behavior can be overridden in `config/403.js`)
      sails.log.debug("policy: sessionAuth: fail");
      res.forbidden();
    }
  }
};
