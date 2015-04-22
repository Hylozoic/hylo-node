
var format = require('util').format,
  passport = require('passport'),
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
  FacebookStrategy = require('passport-facebook').Strategy;

/////////////////////////////
// admin login

var adminStrategy = new GoogleStrategy({
  clientID: process.env.ADMIN_GOOGLE_CLIENT_ID,
  clientSecret: process.env.ADMIN_GOOGLE_CLIENT_SECRET,
  callbackURL: format('%s://%s%s', process.env.PROTOCOL, process.env.DOMAIN, '/admin/login/oauth')
}, function(accessToken, refreshToken, profile, done) {
  var email = profile.emails[0].value;

  if (email.match(/hylo\.com$/)) {
    done(null, {email: email});
  } else {
    done(null, false, {message: "Not a hylo.com address."});
  }
});
adminStrategy.name = 'admin';
passport.use(adminStrategy);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


/////////////////////////////
// user login
//
// doesn't use the serialize and deserialize handlers above
// because we're using workarounds to play nice with Play
// (see UserSession)
//
// TODO at some point when Play is totally out of the picture, refactor all this
// so that the user logins are more in line with conventional usage of Passport, e.g.
// use req.login to set req.user, and only the admin login is unconventional
//

var googleStrategy = new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: format('%s://%s%s', process.env.PROTOCOL, process.env.DOMAIN, '/noo/login/google/oauth')
}, function(accessToken, refreshToken, profile, done) {
  done(null, _.extend(profile, {
    name: profile.displayName,
    email: profile.emails[0].value,
  }));
});
passport.use(googleStrategy);

var facebookStrategy = new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: format('%s://%s%s', process.env.PROTOCOL, process.env.DOMAIN, '/noo/login/facebook/oauth')
}, function(accessToken, refreshToken, profile, done) {
  done(null, _.extend(profile, {
    name: profile.displayName,
    email: profile.emails[0].value
  }));
});
passport.use(facebookStrategy);