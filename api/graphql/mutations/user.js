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
  const existingAccount = user.relations.stripeAccount
  const newAccount = await StripeAccount.forge({
    stripe_account_external_id: accountId
  }).save()
  return user.save({
    stripe_account_id: newAccount.id
  })
  .then(() => {
    if (existingAccount) {
      return existingAccount.destroy()
    }  
  })
  .then(() => ({success: true}))
}

export async function registerStripeAccount (userId, authorizationCode) {
  // TODO: add validation on accountId
  const user = await User.find(userId, {withRelated: 'stripeAccount'})
  console.log('authorizationCode', authorizationCode)
  return {success: true}
}