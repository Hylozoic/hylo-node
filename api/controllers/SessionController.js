var passport = require('passport');

module.exports = {

  create: function(req, res) {
    passport.authenticate('google', {scope: 'email'})(req, res);
  },

  oauth: function(req, res, next) {
    passport.authenticate('google', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      req.login(user, function(err) {
        if (err) { return next(err); }
        return res.redirect('/admin');
      });
    })(req, res, next);
  },

  destroy: function(req, res) {
    req.logout();
    res.redirect('/');
  }

}