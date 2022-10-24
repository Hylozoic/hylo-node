const { GraphQLYogaError } = require('@graphql-yoga/node')
import InvitationService from '../../services/InvitationService'

export async function createInvitation (userId, groupId, data) {
  const group = await Group.find(groupId)
  return GroupMembership.hasModeratorRole(userId, group)
  .then(ok => {
    if (!ok) throw new GraphQLYogaError("You don't have permission to create an invitation for this group")
  })
  .then(() => Group.find(groupId))
  .then((group) => {
    if (!group) throw new GraphQLYogaError('Cannot find group to send invites for')
    return InvitationService.create({
      sessionUserId: userId,
      groupId,
      emails: data.emails,
      message: data.message,
      moderator: data.isModerator || false,
      subject: `Join me in ${group.get('name')} on Hylo!`
    })
  })
  .then(invitations => ({invitations}))
}

export function expireInvitation (userId, invitationId) {
  return InvitationService.checkPermission(userId, invitationId)
  .then(ok => {
    if (!ok) throw new GraphQLYogaError("You don't have permission to modify this invitation")
  })
  .then(() => InvitationService.expire(userId, invitationId))
  .then(() => ({success: true}))
}

export function resendInvitation (userId, invitationId) {
  return InvitationService.checkPermission(userId, invitationId)
  .then(ok => {
    if (!ok) throw new GraphQLYogaError("You don't have permission to modify this invitation")
  })
  .then(() => InvitationService.resend(invitationId))
  .then(() => ({success: true}))
}

export async function reinviteAll (userId, groupId) {
  const group = await Group.find(groupId)
  return GroupMembership.hasModeratorRole(userId, group)
  .then(ok => {
    if (!ok) throw new GraphQLYogaError("You don't have permission to modify this invitation")
  })
  .then(() => InvitationService.reinviteAll({sessionUserId: userId, groupId}))
  .then(() => ({success: true}))
}

export function useInvitation (userId, invitationToken, accessCode) {
  return InvitationService.use(userId, invitationToken, accessCode)
  .then(membership => ({membership}))
  .catch(error => ({error: error.message}))
}
