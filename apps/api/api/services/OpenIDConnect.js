// OAuth 2.0 and OpenID Connect configuration
// https://github.com/panva/node-oidc-provider/blob/main/docs/README.md

import { Provider } from 'oidc-provider'
import KnexAdapter from './oidc/KnexAdapter'
import rsaPemToJwk from 'rsa-pem-to-jwk'

const configuration = {
  adapter: KnexAdapter,
  scopes: ['openid', 'offline_access', 'address', 'email', 'phone', 'profile', 'api:read', 'api:write'],
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
      // XXX: a hack since for some reason on heroku the redirects go to the underlying proxied domain like api-staging.hylo.com but then cookie doesnt work when staging.hylo.com
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : '.hylo.com',
      signed: true,
      httpOnly: true,
      overwrite: true,
      sameSite: 'none'
    },
    short: {
      // XXX: needed since we redirect our interactions to evo routes. Is this dangerous?
      path: '/',
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : '.hylo.com',
      signed: true,
      httpOnly: true,
      overwrite: true,
      sameSite: 'lax'
    }
  },
  extraClientMetadata: {
    properties: [
      'email', // The email address for the client
      'invite_subject', // The email subject of invite messages sent to users created by this client
      'invite_message', // The email body of invite messages sent to users created by this client
      'name', // The name of the API client
      'role', // Can give a client super powers by giving them a role of 'super'
      'noPKCE' // Turn off requirement for PKCE from this client
    ]
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
    // Enable client_credentials flow for machine to machine API access
    clientCredentials: { enabled: true },
    // disable the packaged interactions
    devInteractions: { enabled: false },
    // Enable token introspection
    introspection: { enabled: true },
    // Turning on resource indicators also needed for machine to machine API access
    resourceIndicators: {
      enabled: true,
      defaultResource: (ctx, client, oneOf) => {
        return process.env.PROTOCOL + '://' + process.env.DOMAIN
      },
      getResourceServerInfo: async (ctx, resourceIndicator, client) => {
        return {
          // Super clients get write access
          scope: 'api:read' + (client.role?.includes('super') ? ' api:write' : ''),
          audience: resourceIndicator,
          accessTokenTTL: 2 * 60 * 60, // 2 hours
          accessTokenFormat: 'jwt',
          jwt: {
            sign: { alg: 'RS256' }
          }
        }
      }
    }
  },
  // let's tell oidc-provider where our own interactions will be.
  // setting a nested route is just good practice so that users
  // don't run into weird issues with multiple interactions open
  // at a time.
  interactions: {
    url (ctx, interaction) {
      return `/noo/oidc/interaction/${interaction.uid}`
    }
  },
  jwks: {
    keys: process.env.OIDC_KEYS ? process.env.OIDC_KEYS.split(',').map(k => rsaPemToJwk(Buffer.from(k, 'base64').toString('ascii'), {}, 'private')) : []
  },
  pkce: {
    required: (ctx, client) => {
      return client.noPKCE ? false : true;
    }
  },
  proxy: true,
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
  // TODO: renderError: redirect to nice error page?
  ttl: {
    AccessToken: (ctx, token, client) => {
      if (token.resourceServer) {
        return token.resourceServer.accessTokenTTL || 60 * 60 // 1 hour in seconds
      }
      return 60 * 60 // 1 hour in seconds
    },
    AuthorizationCode: 600 /* 10 minutes in seconds */,
    BackchannelAuthenticationRequest: function BackchannelAuthenticationRequestTTL (ctx, request, client) {
      if (ctx && ctx.oidc && ctx.oidc.params.requested_expiry) {
        return Math.min(10 * 60, +ctx.oidc.params.requested_expiry) // 10 minutes in seconds or requested_expiry, whichever is shorter
      }

      return 10 * 60 // 10 minutes in seconds
    },
    ClientCredentials: function ClientCredentialsTTL (ctx, token, client) {
      if (token.resourceServer) {
        return token.resourceServer.accessTokenTTL || 10 * 60 // 10 minutes in seconds
      }
      return 10 * 60 // 10 minutes in seconds
    },
    DeviceCode: 600 /* 10 minutes in seconds */,
    Grant: 14 * 24 * 60 * 60 /* 14 days in seconds */,
    IdToken: 3600, // 1 hour
    Interaction: 3600 /* 1 hour in seconds */,
    RefreshToken: function RefreshTokenTTL (ctx, token, client) {
      if (
        ctx &&
        ctx.oidc.entities.RotatedRefreshToken &&
        client.applicationType === 'web' &&
        client.tokenEndpointAuthMethod === 'none' &&
        !token.isSenderConstrained()
      ) {
        // Non-Sender Constrained SPA RefreshTokens do not have infinite expiration through rotation
        return ctx.oidc.entities.RotatedRefreshToken.remainingTTL
      }

      return 180 * 24 * 60 * 60 // Refresh token lasts 180 days (TODO: switch to refresh token rotation)
    },
    Session: 1209600 // 14 days in seconds
  }
}

const oidc = new Provider(process.env.PROTOCOL + '://' + process.env.DOMAIN, configuration)

export default oidc
