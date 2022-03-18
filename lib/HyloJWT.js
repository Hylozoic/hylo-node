import { omit } from 'lodash/fp'
import jwt from 'jsonwebtoken'
import { getPublicKeyFromPem } from './util'

export { TokenExpiredError } from 'jsonwebtoken'

export const generateHyloJWT = (sub, data = {}) => {
  const privateKey = Buffer.from(process.env.OIDC_KEYS.split(',')[0], 'base64')

  return jwt.sign(
    {
      iss: process.env.PROTOCOL + '://' + process.env.DOMAIN,
      aud: 'https://hylo.com',
      sub,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration
      ...omit(['iss', 'aud', 'sub', 'exp'], data)
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
      audience: 'https://hylo.com',
      issuer: process.env.PROTOCOL + '://' + process.env.DOMAIN
    }
  )
}
