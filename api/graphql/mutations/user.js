import request from 'request'

export function blockUser (userId, blockedUserId) {
  return BlockedUser.create(userId, blockedUserId)
  .then(() => ({success: true}))
}

export async function unblockUser (userId, blockedUserId) {
  const blockedUser = await BlockedUser.find(userId, blockedUserId)
  if (!blockedUser) throw new Error("user is not blocked")
  return blockedUser.destroy()
  .then(() => ({success: true}))
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