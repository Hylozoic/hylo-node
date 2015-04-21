var passport = require('passport'),
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

/////////////////////////////
// admin login

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

var googleUserStrategy = new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.PROTOCOL + '://' + process.env.DOMAIN + '/noo/login/google/oauth'
}, function(accessToken, refreshToken, profile, done) {
  done(null, _.extend(profile, {
    name: profile.displayName,
    email: profile.emails[0].value,
  }));
});
googleUserStrategy.name = 'google';

passport.use(googleUserStrategy);