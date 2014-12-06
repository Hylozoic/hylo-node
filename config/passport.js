var passport = require('passport'),
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// just return the user's email address

passport.use(new GoogleStrategy({
  clientID: process.env.ADMIN_GOOGLE_CLIENT_ID,
  clientSecret: process.env.ADMIN_GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://' + process.env.DOMAIN + '/admin/login/oauth'
}, function(accessToken, refreshToken, profile, done) {
  done(null, {email: profile.emails[0].value});
}));

// and serialize this small object in the session

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

module.exports = {
  http: {
    customMiddleware: function(app) {
      sails.log.debug('Loading passport middleware');
      app.use(passport.initialize());
      app.use(passport.session());
    }
  }
};