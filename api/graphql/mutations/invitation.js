import InvitationService from '../../services/InvitationService'

export async function createInvitation (userId, communityId, data) {
  const community = await Community.find(communityId)
  return GroupMembership.hasModeratorRole(userId, community)
  .then(ok => {
    if (!ok) throw new Error("You don't have permission to create an invitation for this community")
  })
  .then(() => InvitationService.create({
    sessionUserId: userId,
    communityId,
    emails: data.emails,
    message: data.message,
    moderator: data.isModerator || false,
    subject: 'Join our community!'
  }))
  .then(invitations => ({invitations}))
}

export function expireInvitation (userId, invitationId) {
  return InvitationService.checkPermission(userId, invitationId)
  .then(ok => {
    if (!ok) throw new Error("You don't have permission to modify this invitation")
  })
  .then(() => InvitationService.expire(userId, invitationId))
  .then(() => ({success: true}))
}

export function resendInvitation (userId, invitationId) {
  return InvitationService.checkPermission(userId, invitationId)
  .then(ok => {
    if (!ok) throw new Error("You don't have permission to modify this invitation")
  })
  .then(() => InvitationService.resend(invitationId))
  .then(() => ({success: true}))
}

export async function reinviteAll (userId, communityId) {
  const community = await Community.find(communityId)
  return GroupMembership.hasModeratorRole(userId, community)
  .then(ok => {
    if (!ok) throw new Error("You don't have permission to modify this invitation")
  })
  .then(() => InvitationService.reinviteAll({sessionUserId: userId, communityId}))
  .then(() => ({success: true}))
}

export function useInvitation (userId, invitationToken, accessCode) {
  return InvitationService.use(userId, invitationToken, accessCode)
  .then(membership => ({membership}))
  .catch(error => ({error: error.message}))
}
