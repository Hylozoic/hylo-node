import { omit } from 'lodash/fp'
import jwt from 'jsonwebtoken'
import { getPublicKeyFromPem } from './util'

export { TokenExpiredError } from 'jsonwebtoken'

export const generateHyloJWT = (sub, data = {}) => {
  const privateKey = Buffer.from(process.env.OIDC_KEYS.split(',')[0], 'base64')

  return jwt.sign(
    {
      iss: process.env.PROTOCOL + '://' + process.env.DOMAIN,
      aud: process.env.PROTOCOL + '://' + process.env.DOMAIN,
      sub,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration by default
      ...omit(['iss', 'aud', 'sub'], data)
    },
    privateKey,
    {
      algorithm: 'RS256'
    }
  )
}

export const decodeHyloJWT = token => {
  return jwt.verify(
    token,
    getPublicKeyFromPem(process.env.OIDC_KEYS.split(',')[0]),
    {
      // XXX: does checking audience make sense here? we would have to know the resource values used in generating the JWT for API calls
      // audience: process.env.PROTOCOL + '://' + process.env.DOMAIN,
      issuer: process.env.PROTOCOL + '://' + process.env.DOMAIN
    }
  )
}
