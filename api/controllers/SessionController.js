var passport = require('passport');

module.exports = {

  create: function(req, res) {
    var email = req.param('email'),
      password = req.param('password');

    return User.authenticate(email, password).then(function(user) {
      UserSession.setup(req, user, 'password');
      return user.save({last_login: new Date()}, {patch: true});
    }).then(function() {
      res.ok({});
    }).catch(function(err) {
      res.status(422).send(err); // well-formed but semantically invalid
    });
  },

  startGoogleOAuth: function(req, res) {
    passport.authenticate('google', {scope: 'email'})(req, res);
  },

  finishGoogleOAuth: function(req, res, next) {
    passport.authenticate('google', function(err, profile, info) {
      if (err) { return next(err); }
      if (!profile) { return res.redirect('/h/login'); }

      // TODO or find by google id
      User.where({email: profile.email}).fetch({
        withRelated: ['linkedAccounts']
      }).then(function(user) {
        if (user) {
          UserSession.setup(req, user, 'google');
          // TODO create linked account if necessary
        } else {
          // TODO create a new user with name, email, google linked account
          UserSession.setup(req, user, 'google');
        }
        res.redirect('/app');
      });
    })(req, res, next);
  },

  destroy: function(req, res) {
    req.session.destroy();
    res.redirect('/');
  }

}