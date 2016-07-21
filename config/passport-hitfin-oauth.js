var util = require('util')
    , OAuth2Strategy = require('passport-oauth').OAuth2Strategy
    , InternalOAuthError = require('passport-oauth').InternalOAuthError;

// TODO: Use HitFin OAuth instead of google (this is pretty much a copy of passport-google-oauth/oauth2.js ATM)
const AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const TOKEN_URL = 'https://accounts.google.com/o/oauth2/token';
const PROFILE_URL = 'https://www.googleapis.com/oauth2/v1/userinfo';
const PROVIDER_NAME = 'hit-fin';

function Strategy(options, verify) {
    options = options || {};
    options.authorizationURL = options.authorizationURL || AUTH_URL;
    options.tokenURL = options.tokenURL || TOKEN_URL;
    options.scope = options.scope || ['email'];

    OAuth2Strategy.call(this, options, verify);
    this.name = PROVIDER_NAME;
}
util.inherits(Strategy, OAuth2Strategy);

Strategy.prototype.userProfile = function (accessToken, done) {
    this._oauth2.get(PROFILE_URL, accessToken, function (err, body, res) {
        if (err) {
            return done(new InternalOAuthError('failed to fetch user profile', err));
        }

        try {
            var json = JSON.parse(body);

            var profile = {provider: PROVIDER_NAME};
            profile.id = json.id;
            profile.displayName = json.name;
            profile.name = {
                familyName: json.family_name,
                givenName: json.given_name
            };
            profile.emails = [{value: json.email}];

            profile._raw = body;
            profile._json = json;

            done(null, profile);
        } catch (e) {
            done(e);
        }
    });
}

exports.Strategy = Strategy;
