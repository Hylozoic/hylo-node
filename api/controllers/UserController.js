import { en } from '../../lib/i18n/en'
import { es } from '../../lib/i18n/es'
import InvitationService from '../services/InvitationService'
import OIDCAdapter from '../services/oidc/KnexAdapter'
const locales = {es, en}

module.exports = {

  create: async function (req, res) {
    const { name, email, groupId, isModerator } = req.allParams()
    const group = groupId && await Group.find(groupId)
    const isModeratorVal = isModerator && isModerator === 'true'

    let user = await User.find(email, {}, false)
    if (user) {
      // User already exists
      if (group) {
        const locale = user?.get('settings')?.locale || 'en'
        if (!(await GroupMembership.hasActiveMembership(user, group))) {
          // If user exists but is not part of the group then invite them
          let message = locales[locale].apiInviteMessageContent(req.api_client)
          let subject = locales[locale].apiInviteMessageSubject(group.get('name'))
          if (req.api_client) {
            const client = await (new OIDCAdapter("Client")).find(req.api_client.id)
            if (!client) {
              return res.status(403).json({ error: 'Unauthorized' })
            }
            subject = client.invite_subject || locales[locale].clientInviteSubjectDefault(group.get('name'))
            message = client.invite_message || locales[locale].clientInviteMessageDefault({userName: user.get('name'), groupName: group.get('name')})
          }
          const inviteBy = await group.moderators().fetchOne()

          await InvitationService.create({
            groupId: group.id,
            isModerator: isModeratorVal,
            message,
            sessionUserId: inviteBy?.id,
            subject,
            userIds: [user.id]
          })
          return res.ok({ message: `User already exists, invite sent to group ${group.get('name')}` })
        }
        return res.ok({ message: `User already exists, and is already a member of this group` })
      }
      return res.ok({ message: "User already exists" })
    }

    const attrs = { name, email: email ? email.toLowerCase() : null, email_validated: false, active: false, group }
    if (isModeratorVal) {
      attrs['role'] = GroupMembership.Role.MODERATOR
    }

    return User.create(attrs)
      .then(async (user) => {
        Queue.classMethod('Email', 'sendFinishRegistration', {
          email,
          templateData: {
            api_client: req.api_client?.name,
            group_name: group && group.get('name'),
            version: 'with link',
            verify_url: Frontend.Route.verifyEmail(email, user.generateJWT())
          }
        })

        return res.ok({
          id: user.id,
          name: user.get('name'),
          email: user.get('email')
        })
      })
      .catch(function (err) {
        res.status(422).send({ error: err.message ? err.message : err })
      })
  }

}
