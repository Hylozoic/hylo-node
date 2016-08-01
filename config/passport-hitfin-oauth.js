var util = require('util')
    , OAuth2Strategy = require('passport-oauth').OAuth2Strategy
    , InternalOAuthError = require('passport-oauth').InternalOAuthError;

// TODO: Use HitFin OAuth instead of google (this is pretty much a copy of passport-google-oauth/oauth2.js ATM)
const AUTH_URL = process.env.HITFIN_API_URL + '/o/oauth2/auth';
const TOKEN_URL = process.env.HITFIN_API_URL + '/o/oauth2/token';
const PROVIDER_NAME = 'hit-fin';

function Strategy(options, verify) {
    options = options || {};
    options.authorizationURL = options.authorizationURL || AUTH_URL;
    options.tokenURL = options.tokenURL || TOKEN_URL;
    options.scope = options.scope || ['email'];
    options.clientSecret = options.clientSecret;
    options.skipUserProfile = true;
    OAuth2Strategy.call(this, options, verify);
    this.name = PROVIDER_NAME;
}

util.inherits(Strategy, OAuth2Strategy);

exports.Strategy = Strategy;
