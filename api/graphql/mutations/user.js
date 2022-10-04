const { GraphQLYogaError } = require('@graphql-yoga/node')

import request from 'request'
import { decodeHyloJWT } from '../../../lib/HyloJWT'

// Sign-up Related

export const sendEmailVerification = async (_, { email }) => {
  try {
    let user = await User.find(email, {}, false)

    if (!user) {
      user = await User.create({ email, active: false })
    }

    const { code, token } = await UserVerificationCode.create(email)

    Queue.classMethod('Email', 'sendEmailVerification', {
      email,
      version: 'with link',
      templateData: {
        code,
        verify_url: Frontend.Route.verifyEmail(email, token)
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const verifyEmail = (fetchOne, { req }) => async (_, { email: providedEmail, code: providedCode, token }) => {
  try {
    const decodedToken = token && decodeHyloJWT(token)
    const email = decodedToken?.sub || providedEmail
    const code = decodedToken?.code || providedCode

    // XXX: Don't need the code when verifying by JWT link but we still want to
    // expire the code if it does exist when the JWT is used
    if (code && !(await UserVerificationCode.verify({ email, code }))) {
      return { error: token ? 'invalid-link' : 'invalid-code' }
    }

    const user = await User.find(email, {}, false)

    await user.save({ email_validated: true })

    req.session.userId = user.id

    return { me: fetchOne('Me', user.id) }
  } catch (error) {
    return { error: token ? 'invalid-link' : 'invalid-code' }
  }
}

export const register = (fetchOne, { req }) => async (_, { name, password }) => {
  try {
    const user = await User.find(req.session.userId, {}, false)

    if (!user) {
      throw new GraphQLYogaError('Not authorized')
    }

    if (!user.get('email_validated')) {
      throw new GraphQLYogaError('Email not validated')
    }

    await bookshelf.transaction(async transacting => {
      await user.save({ name, active: true }, { transacting })
      await UserSession.login(req, user, 'password', { transacting }) // XXX: this does another save of the user, ideally we just do one of those
      await LinkedAccount.create(user.id, { type: 'password', password }, { transacting })
      await Analytics.trackSignup(user.id, req)
    })

    return { me: fetchOne('Me', user.id) }
  } catch (error) {
    // Use a generic message?: 'Error registering user'
    return { error: error.message }
  }
}

// Login and Logout

export const login = (fetchOne, { req }) => async (_, { email, password }) => {
  try {
    const isLoggedIn = await UserSession.isLoggedIn(req)

    // Based upon current front-end implemenations this should never run,
    // wondering if it might be better to logout and authenticate with the
    // provided credentials.
    if (isLoggedIn) {
      return {
        me: fetchOne('Me', req.session.userId),
        error: 'already logged-in'
      }
    }

    const user = await User.authenticate(email, password)

    await UserSession.login(req, user, 'password')
    
    return { me: fetchOne('Me', user.id) }
  } catch(error) {
    return { error: error.message }
  }
}

export const logout = ({ req }) => async () => {
  await req.session.destroy()

  return { success: true }
}

// Other User resolvers

export const sendPasswordReset = async (_, { email }) => {
  try {
    const user = await User.query(q => q.whereRaw('lower(email) = ?', email.toLowerCase())).fetch()
    
    if (user) {
      const nextUrl = Frontend.Route.evo.passwordSetting()
      const token = user.generateJWT()

      Queue.classMethod('Email', 'sendPasswordReset', {
        email: user.get('email'),
        templateData: {
          login_url: Frontend.Route.jwtLogin(user, token, nextUrl)
        }
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false }
  }
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

export async function blockUser (userId, blockedUserId) {
  await BlockedUser.create(userId, blockedUserId)

  return { success: true }
}

export async function unblockUser (userId, blockedUserId) {
  const blockedUser = await BlockedUser.find(userId, blockedUserId)

  if (!blockedUser) throw new GraphQLYogaError('user is not blocked')

  await blockedUser.destroy()

  return { success: true }
}

// Stripe related

export async function updateStripeAccount (userId, accountId) {
  // TODO: add validation on accountId
  const user = await User.find(userId, {withRelated: 'stripeAccount'})

  await user.updateStripeAccount(accountId)

  return { success: true }
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
  
  return { success: true }
}
