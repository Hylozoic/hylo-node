module.exports = {

  create: function(req, res) {
    var email = req.param('email'),
      password = req.param('password');

    User.authenticate(email, password).then(function(user) {
      UserSession.setup(req, user, 'password');
      return user.save({last_login: new Date()}, {patch: true}).then(function() {
        return UserPresenter.fetchForSelf(user.id);
      });

    }).then(function(attributes) {
      res.ok(UserPresenter.presentForSelf(attributes, req.session));
    }).catch(function(err) {
      sails.log(err);
      res.badRequest(err);
    });
  },

  destroy: function(req, res) {
    req.session.destroy();

    // now sign out of Play! janky janky janky.
    res.redirect('/logout');
  }

}