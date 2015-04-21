var passport = require('passport'),
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// just return the user's email address

var adminStrategy = new GoogleStrategy({
  clientID: process.env.ADMIN_GOOGLE_CLIENT_ID,
  clientSecret: process.env.ADMIN_GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.PROTOCOL + '://' + process.env.DOMAIN + '/admin/login/oauth'
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

// and serialize this small object in the session

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


var userStrategy = new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.PROTOCOL + '://' + process.env.DOMAIN + '/noo/login/google/oauth'
}, function(accessToken, refreshToken, profile, done) {
  done(null, {
    name: profile.displayName,
    email: profile.emails[0].value,
  });
});
userStrategy.name = 'google';

passport.use(userStrategy);