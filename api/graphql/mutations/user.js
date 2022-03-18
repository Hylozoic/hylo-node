import request from 'request'

// Sign-up Related

export const sendEmailVerification = async (_, { email }) => {
  try {
    let user = await User.find(email, {}, false)

    // Email already validated: 
    // send failure without error to not reveal account existence
    if (user?.get('email_validated')) {
      return { success: false }
    }

    // User is new or exists without a validated email:
    // send verification email
    if (!user) {
      user = await User.create({ email, active: false })
    }

    // TODO: Check here if a non-expired UserVerificationCode already exists for this user
    //       if so extend expiration for another 4 hours and resend that code?
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
    return { success: false }
  }
}

export const verifyEmail = (fetchOne, { req }) => async (_, { code, email, token }) => {
  try {
    const codeVerified = await UserVerificationCode.verify({
      email,
      code,
      token
    })

    if (!codeVerified) {
      return { error: 'Invalid code, please try again' }
    }

    const user = await User.find(email, {}, false)

    await user.save({ email_validated: true })

    req.session.userId = user.id

    return {
      me: fetchOne('Me', user.id)
    }
  } catch (error) {
    return { error: 'Link expired, please start over' }
  }
}

export const register = (fetchOne, { req }) => async (_, { name, password }) => {
  try {
    const user = await User.find(req.session.userId, {}, false)

    if (!user) {
      return { error: 'Not authorized' }
    }

    if (!user.get('email_validated')) {
      return { error: 'Email not validated' }
    }

    await bookshelf.transaction(async transacting => {
      await user.save({ name, active: true }, { transacting })
      await UserSession.login(req, user, 'password', { transacting }) // XXX: this does another save of the user, ideally we just do one of those
      await LinkedAccount.create(user.id, { type: 'password', password }, { transacting })
      await Analytics.trackSignup(user.id, req)
    })

    return { me: fetchOne('Me', user.id) }
  } catch (error) {
    return {
      // Maybe better to keep it simple and return generic message:
      // error: 'Error registering user'
      error: error.message
    }
  }
}

// Login and Logout

export const login = (fetchOne, { req }) => async (_, { email, password }) => {
  try {
    const isLoggedIn = await UserSession.isLoggedIn(req)

    if (isLoggedIn) {
      return {
        me: fetchOne('Me', req.session.userId),
        error: 'already logged-in'
      }
    }
    const user = await User.authenticate(email, password)
    
    await UserSession.login(req, user, 'password')
    
    return { me: fetchOne('Me', user.id) }
  } catch(err) {
    return { error: err.message }
  }
}

export const logout = ({ req }) => async () => {
  await req.session.destroy()

  return { success: true }
}

// Other User resolvers

export const sendPasswordReset = async (_, { email }) => {
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

  if (!blockedUser) throw new Error('user is not blocked')

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
