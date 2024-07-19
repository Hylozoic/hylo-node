var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
var GoogleTokenStrategy = require('passport-google-token').Strategy
var FacebookStrategy = require('passport-facebook').Strategy
var FacebookTokenStrategy = require('passport-facebook-token')
var LinkedinStrategy = require('passport-linkedin-oauth2').Strategy
var LinkedInTokenStrategy = require('passport-linkedin-token-oauth2').Strategy
import { getPublicKeyFromPem } from '../lib/util'

// -----------
// admin login

var adminStrategy = new GoogleStrategy({
  clientID: process.env.ADMIN_GOOGLE_CLIENT_ID,
  clientSecret: process.env.ADMIN_GOOGLE_CLIENT_SECRET,
  callbackURL: format('%s://%s%s', process.env.PROTOCOL, process.env.DOMAIN, '/noo/admin/login/oauth')
}, function (accessToken, refreshToken, profile, done) {
  var email = profile.emails[0].value

  if (email.match(/hylo\.com$/)) {
    done(null, {email: email})
  } else {
    done(null, false, {message: 'Not a hylo.com address.'})
  }
})
adminStrategy.name = 'admin'
passport.use(adminStrategy)

passport.serializeUser(function (user, done) {
  done(null, user)
})

passport.deserializeUser(function (user, done) {
  done(null, user)
})

// -----------
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

var url = function (path) {
  return format('%s://%s%s', process.env.PROTOCOL, process.env.DOMAIN, path)
}

var formatProfile = function (profile, accessToken, refreshToken) {
  return _.merge(profile, {
    name: profile.displayName,
    email: _.get(profile, 'emails.0.value'),
    _json: {
      access_token: accessToken,
      refresh_token: refreshToken
    }
  })
}

var googleStrategy = new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: url('/noo/login/google/oauth')
}, function (accessToken, refreshToken, profile, done) {
  done(null, formatProfile(profile))
})
passport.use(googleStrategy)

var facebookStrategy = new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: url('/noo/login/facebook/oauth'),
  scope: ['public_profile', 'email', 'user_friends', 'user_about_me', 'user_likes', 'user_location'],
  profileFields: ['id', 'displayName', 'email', 'link']
}, function (accessToken, refreshToken, profile, done) {
  done(null, formatProfile(profile, accessToken, refreshToken))
})
passport.use(facebookStrategy)

var facebookTokenStrategy = new FacebookTokenStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  scope: ['public_profile', 'email', 'user_friends', 'user_about_me', 'user_likes', 'user_location'],
  profileFields: ['id', 'displayName', 'email', 'link']
}, function (accessToken, refreshToken, profile, done) {
  done(null, formatProfile(profile, accessToken, refreshToken))
})
passport.use(facebookTokenStrategy)

var googleTokenStrategy = new GoogleTokenStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
}, function (accessToken, refreshToken, profile, done) {
  done(null, formatProfile(profile))
})
passport.use(googleTokenStrategy)

var linkedinStrategy = new LinkedinStrategy({
  clientID: process.env.LINKEDIN_API_KEY,
  clientSecret: process.env.LINKEDIN_API_SECRET,
  callbackURL: url('/noo/login/linkedin/oauth'),
  scope: ['r_emailaddress', 'r_basicprofile'],
  state: true
}, function (accessToken, refreshToken, profile, done) {
  done(null, formatProfile(profile))
})
passport.use(linkedinStrategy)

var linkedinTokenStrategy = new LinkedInTokenStrategy({
  clientID: process.env.LINKEDIN_API_KEY,
  clientSecret: process.env.LINKEDIN_API_SECRET
}, function (accessToken, refreshToken, profile, done) {
  done(null, formatProfile(profile))
})
passport.use(linkedinTokenStrategy)


//**** JWT login for email verification, password reset... ****//
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'

let opts = {}
opts.jwtFromRequest = ExtractJwt.fromExtractors([ ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token') ])
opts.secretOrKey = getPublicKeyFromPem(process.env.OIDC_KEYS.split(',')[0])
// TODO: in the future this could be something like accounts.hylo.com
opts.issuer = process.env.PROTOCOL + '://' + process.env.DOMAIN
opts.audience = process.env.PROTOCOL + '://' + process.env.DOMAIN
opts.algorithms = ['RS256']
opts.jsonWebTokenOptions = {
  // 4 hours because right now we only use these tokens for password reset and email verification and want to quickly invalidate, could even be quicker
  maxAge: '4h'
}
passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
  User.find(jwt_payload.sub, {}, false).then(user => {
    if (user) {
      return done(null, user)
    } else {
      return done(null, false, "User not found")
    }
  })
}))
