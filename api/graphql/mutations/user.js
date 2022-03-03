import jwt from 'jsonwebtoken'
import request from 'request'
import { getPublicKeyFromPem } from '../../../lib/util'

export const createSession = (userId, fetchOne, { req }) => async (root, { email, password }) => {
  try {
    const isLoggedIn = await UserSession.isLoggedIn(req)
    if (isLoggedIn) {
      return {
        me: fetchOne('Me', userId),
        error: 'already logged-in'
      }
    }
    const user = await User.authenticate(email, password)
    await UserSession.login(req, user, 'password')
    return {
      me: fetchOne('Me', user.id)
    }
  } catch(err) {
    throw new Error(err.message)
  }
}

export async function register({ req }, { name, password }) {
  let user = await User.find(req.session.userId, {}, false)
  if (!user) {
    throw new Error("Not authorized")
  }
  if (!user.get('email_validated')) {
    throw new Error("Email not validated")
  }

  return bookshelf.transaction(transacting =>
    user.save({ name, active: true }, { transacting }).then(async (user) => {
      await UserSession.login(req, user, 'password', { transacting }) // XXX: this does another save of the user, ideally we just do one of those
      await LinkedAccount.create(user.id, { type: 'password', password }, { transacting })
      await Analytics.trackSignup(user.id, req)
      return user
    })
    .catch(function (err) {
      console.log("Error registering user", err.message)
      throw err
    })
  )
}

export function blockUser (userId, blockedUserId) {
  return BlockedUser.create(userId, blockedUserId)
  .then(() => ({ success: true }))
}

export async function unblockUser (userId, blockedUserId) {
  const blockedUser = await BlockedUser.find(userId, blockedUserId)
  if (!blockedUser) throw new Error('user is not blocked')
  return blockedUser.destroy()
  .then(() => ( {success: true }))
}

export async function deactivateUser ({ userId, sessionId }) {
  const user = await User.find(userId)
  await user.deactivate(sessionId)
  return { success: true }
}

export async function reactivateUser ({ userId }) {
  const user = await User.find(userId, {}, false)
  await user.reactivate()
  return { success: true }
}

export async function deleteUser ({ userId, sessionId }) {
  const user = await User.find(userId)
  await user.sanelyDeleteUser({ sessionId })
  return { success: true }
}

export async function updateStripeAccount (userId, accountId) {
  // TODO: add validation on accountId
  const user = await User.find(userId, {withRelated: 'stripeAccount'})
  user.updateStripeAccount(accountId)
  .then(() => ({success: true}))
}

export async function registerStripeAccount (userId, authorizationCode) {
  const user = await User.find(userId, {withRelated: 'stripeAccount'})
  const options = {
    uri: 'https://connect.stripe.com/oauth/token',
    form: {
      client_secret: process.env.STRIPE_API_KEY,
      code: authorizationCode,
      grant_type: 'authorization_code'
    },
    json: true
  }
  // TODO: this should be in a promise chain
  request.post(options, async (err, response, body) => {
    const accountId = body.stripe_user_id
    const refreshToken = body.refresh_token
    if (accountId && refreshToken) {
      await user.updateStripeAccount(accountId, refreshToken)
    }
  })
  return Promise.resolve({success: true})
}

export async function verifyEmail({ req, res }, { code, email, token }) {
  let identifier = email

  if (token) {
    const verify = Promise.promisify(jwt.verify, jwt)
    try {
      const decoded = await jwt.verify(
        token,
        getPublicKeyFromPem(process.env.OIDC_KEYS.split(',')[0]),
        { audience: 'https://hylo.com', issuer: process.env.PROTOCOL + '://' + process.env.DOMAIN }
      )

      identifier = decoded.sub
      code = decoded.code
    } catch (e) {
      console.error("Error verifying token:", e.message)
      throw new Error('invalid-link')
    }
  }

  const user = await User.find(identifier, {}, false)

  // XXX: Don't need the code when verifying by JWT link but we still want to expire the code when the JWT is used
  if (!user || (code && !await UserVerificationCode.verify(user.get('email'), code))) {
    throw new Error(token ? 'invalid-link' : 'invalid code')
  }

  await user.save({ email_validated: true })

  req.session.userId = user.id

  return user
}
