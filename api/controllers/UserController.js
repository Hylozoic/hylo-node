import InvitationService from '../services/InvitationService'
import OIDCAdapter from '../services/oidc/KnexAdapter'

module.exports = {

  create: async function (req, res) {
    const { name, email, groupId } = req.allParams()
    const group = groupId && await Group.find(groupId)

    let user = await User.find(email, {}, false)
    if (user) {
      // User already exists
      if (group) {
        if (!(await GroupMembership.hasActiveMembership(user, group))) {
          // If user exists but is not part of the group then invite them
          let message = `${req.api_client} is excited to invite you to join our community on Hylo.`
          let subject = `Join me in ${group.get('name')} on Hylo!`
          if (req.api_client) {
            const client = await (new OIDCAdapter("Client")).find(req.api_client.id)
            if (!client) {
              return res.status(403).json({ error: 'Unauthorized' })
            }
            subject = client.invite_subject || `You've been invited to join ${group.get('name')} on Hylo`
            message = client.invite_message || `Hi ${user.get('name')}, <br><br> We're excited to welcome you into our community. Click below to join ${group.get('name')} on Hylo.`
          }
          const inviteBy = await group.moderators().fetchOne()

          await InvitationService.create({
            sessionUserId: inviteBy?.id,
            groupId: group.id,
            userIds: [user.id],
            message,
            subject
          })
        }
      }
      return res.ok({ message: "User already exists" })
    }

    return User.create({name, email: email ? email.toLowerCase() : null, email_validated: false, active: false, group })
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
