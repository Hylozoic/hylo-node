// OAuth 2.0 and OpenID Connect configuration
// https://github.com/panva/node-oidc-provider/blob/main/docs/README.md

import { Provider } from 'oidc-provider'
import knexAdapter from './oidc/knexAdapter'
import rsaPemToJwk from 'rsa-pem-to-jwk'

const configuration = {
  adapter: knexAdapter,
  scopes: ['address', 'email', 'phone', 'profile'],
  claims: {
    openid: ['sub'],
    address: ['address'],
    email: ['email', 'email_verified'],
    phone: ['phone_number'], // 'phone_number_verified'
    profile: ['name', 'picture', 'updated_at', 'website']
              // 'birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'nickname', 'preferred_username', 'profile', 'zoneinfo'
  },
  clients: [],
  // This seems to be needed? but maybe we want something client based like:
  //   https://github.com/panva/node-oidc-provider/blob/main/recipes/client_based_origins.md
  clientBasedCORS: (ctx, origin, client) => {
    return true
  },
  // XXX: setting to false allows us to return user info in the id_token without an additional API request, do we want this?
  conformIdTokenClaims: false,
  cookies: {
    keys: [process.env.COOKIE_SECRET],
    long: {
      // XXX: setting path to / needed since we redirect our interactions to evo routes. Is this dangerous?
      path: '/',
      signed: true
    },
    short: {
      // XXX: needed since we redirect our interactions to evo routes. Is this dangerous?
      path: '/',
      signed: true
    }
  },
  extraClientMetadata: {
    properties: ['name']
  },
  findAccount: async (ctx, id, token) => {
    const user = await User.find(id)
    if (user) {
      user.accountId = id
      return user
    }
    return null
  },
  features: {
    // disable the packaged interactions
    devInteractions: { enabled: false }
  },
  // let's tell oidc-provider where our own interactions will be
  // setting a nested route is just good practice so that users
  // don't run into weird issues with multiple interactions open
  // at a time.
  interactions: {
    url(ctx, interaction) {
      return `/noo/oidc/interaction/${interaction.uid}`
    },
  },
  jwks: {
    keys: process.env.OIDC_KEYS ? process.env.OIDC_KEYS.split(',').map(k => rsaPemToJwk(Buffer.from(k, 'base64').toString('ascii'), {}, 'private')) : []
  },
  pkce: {
    required: true
  },
  proxy: true, // maybe??
  routes: {
    authorization: '/auth',
    backchannel_authentication: '/backchannel',
    code_verification: '/device',
    device_authorization: '/device/auth',
    end_session: '/session/end',
    introspection: '/token/introspection',
    jwks: '/jwks',
    pushed_authorization_request: '/request',
    registration: '/reg',
    revocation: '/token/revocation',
    token: '/token',
    userinfo: '/me'
  },
  //TODO: renderError: redirect to nice error page?
  ttl: {
    AccessToken: (ctx, token, client) => {
      if (token.resourceServer) {
        return token.resourceServer.accessTokenTTL || 60 * 60 // 1 hour in seconds
      }
      return 60 * 60 // 1 hour in seconds
    },
    IdToken: 3600, // 1 hour
    Interaction: 1800, // 30 minutes expiration for interaction artifacts
    Session: 1209600 // 14 days in seconds
  }

}

const oidc = new Provider('https://localhost:3000', configuration)

export default oidc
