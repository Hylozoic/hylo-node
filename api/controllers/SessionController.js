module.exports = {

  create: function(req, res) {
    var email = req.param('email'),
      password = req.param('password');

    User.authenticate(email, password).then(function(user) {
      UserSession.setup(req, user, 'password');
      return user.save({last_login: new Date()}, {patch: true});
    }).then(function() {
      res.ok({});
    }).catch(function(err) {
      res.badRequest(err);
      res.status(422); // well-formed but semantically invalid
    });
  },

  destroy: function(req, res) {
    req.session.destroy();

    // now sign out of Play! janky janky janky.
    res.redirect('/logout');
  }

}