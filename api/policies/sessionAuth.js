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
var sessionDataVersion = '3';

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
  } else if (req.session.authenticated && req.session.version == sessionDataVersion) {
    return next();
  }

  var playSession = new PlaySession(req);

  if (playSession.isValid()) {
    playSession.fetchUser().then(function(user) {
      if (!user)
        return tryPublic(res, next);

      sails.log.debug("policy: sessionAuth: validated as " + user.get('email'));

      req.session.authenticated = true;
      req.session.userId = user.id;
      req.session.userProvider = playSession.providerKey();
      req.rollbar_person = user.pick('id', 'name', 'email');
      req.session.version = sessionDataVersion;
      next();
    });

  } else {
    tryPublic(res, next);
  }

};
