import { filter, isEmpty, mapKeys, merge, pick, snakeCase } from 'lodash'
import { en } from '../../lib/i18n/en'
import { es } from '../../lib/i18n/es'
import InvitationService from '../services/InvitationService'
import OIDCAdapter from '../services/oidc/KnexAdapter'
import { decodeHyloJWT } from '../../lib/HyloJWT'

const locales = { es, en }

module.exports = {

  create: async function (req, res) {
    const { name, email, groupId, isModerator } = req.allParams()
    const group = groupId && await Group.find(groupId)
    const isModeratorVal = isModerator && isModerator === 'true'

    const user = await User.find(email, {}, false)
    if (user) {
      // User already exists
      if (group) {
        const locale = user?.getLocale()
        if (!(await GroupMembership.hasActiveMembership(user, group))) {
          // If user exists but is not part of the group then invite them
          let message = locales[locale].apiInviteMessageContent(req.api_client)
          let subject = locales[locale].apiInviteMessageSubject(group.get('name'))
          if (req.api_client) {
            const client = await (new OIDCAdapter('Client')).find(req.api_client.id)
            if (!client) {
              return res.status(403).json({ error: 'Unauthorized' })
            }
            subject = client.invite_subject || locales[locale].clientInviteSubjectDefault(group.get('name'))
            message = client.invite_message || locales[locale].clientInviteMessageDefault({ userName: user.get('name'), groupName: group.get('name') })
          }
          const inviteBy = await group.stewards().fetchOne()

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
        return res.ok({ message: 'User already exists, and is already a member of this group' })
      }
      return res.ok({ message: 'User already exists' })
    }

    const attrs = { name, email: email ? email.toLowerCase() : null, email_validated: false, active: false, group }
    if (isModeratorVal) {
      attrs.role = GroupMembership.Role.MODERATOR // This is ultimately fed to Group.addMembers, which handles mod -> Coordinator. TODO: RESP, fix this
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
  },

  getNotificationSettings: async function (req, res) {
    const { token } = req.allParams()

    // Look for the user id in the JWT token and make sure the token is the right kind
    const decodedToken = decodeHyloJWT(token)
    const user = await User.find(decodedToken.sub)
    if (!user || decodedToken.action !== 'notification_settings') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const memberships = await user.memberships().fetch()
    const emailable = filter(memberships.models, mem => mem.getSetting('sendEmail'))
    const pushable = filter(memberships.models, mem => mem.getSetting('sendPushNotifications'))

    return res.ok({
      digestFrequency: user.get('settings')?.digest_frequency || 'daily',
      dmNotifications: user.get('settings')?.dm_notifications || 'both',
      commentNotifications: user.get('settings')?.comment_notifications || 'both',
      postNotifications: user.get('settings')?.post_notifications || 'important',
      sendEmail: !isEmpty(emailable),
      sendPushNotifications: !isEmpty(pushable),
      hasDevice: await user.hasDevice()
    })
  },

  // Update a user's notification settings
  // Autheticate them with a JWT token, and then allow them to update their notification settings
  updateNotificationSettings: async function (req, res) {
    const { token } = req.allParams()
    const { unsubscribeAll, allGroupNotifications } = req.body

    // Look for the user id in the JWT token and make sure the token is the right kind
    const decodedToken = decodeHyloJWT(token)
    const user = await User.find(decodedToken.sub)

    if (!user || decodedToken.action !== 'notification_settings') {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Update the user's notification settings
    const userSettings = unsubscribeAll
      ? {
          digest_frequency: 'never',
          dm_notifications: 'none',
          comment_notifications: 'none',
          post_notifications: 'none'
        }
      : mapKeys(pick(req.body, ['digestFrequency', 'dmNotifications', 'commentNotifications', 'postNotifications']), (v, k) => snakeCase(k))

    await user.save({ settings: merge({}, user.get('settings'), userSettings) }, { patch: true })

    let newMembershipSettings = false

    // Update the settings for their group memberships
    if (unsubscribeAll || allGroupNotifications === 'none' || allGroupNotifications === 'push') {
      newMembershipSettings = '\'sendEmail\', false'
    } else if (allGroupNotifications === 'email' || allGroupNotifications === 'both') {
      newMembershipSettings = '\'sendEmail\', true'
    }

    if (unsubscribeAll || allGroupNotifications === 'none' || allGroupNotifications === 'email') {
      newMembershipSettings = (newMembershipSettings ? newMembershipSettings + ',' : '') + '\'sendPushNotifications\', false'
    } else if (allGroupNotifications === 'push' || allGroupNotifications === 'both') {
      newMembershipSettings = (newMembershipSettings ? newMembershipSettings + ',' : '') + '\'sendPushNotifications\', true'
    }

    if (newMembershipSettings) {
      await bookshelf.knex.raw('update group_memberships set settings = settings || jsonb_build_object(' + newMembershipSettings + ') where user_id = ' + user.id)
    }

    return res.ok({ message: 'Notification settings updated' })
  }

}
