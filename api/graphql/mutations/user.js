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
