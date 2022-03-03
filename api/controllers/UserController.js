import jwt from 'jsonwebtoken'
import { getPublicKeyFromPem } from '../../lib/util'
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
          name: user.get('name'),
          email: user.get('email')
        })
      })
      .catch(function (err) {
        res.status(422).send({ error: err.message ? err.message : err })
      })
  },

  status: function (req, res) {
    res.ok({ signedIn: !!req.session.userId })
  },

  sendEmailVerification: async function (req, res) {
    const email = req.param('email')

    let user = await User.find(email, {}, false)
    if (user) {
      if (user.hasRegistered()) {
        // User already registered, front-end can redirect to login page
        return res.status(422).send({ error: 'duplicate-email' })
      }
      // if user exists but has not registered then we continue and send them another verification email
    } else {
      user = await User.create({ email, active: false })
    }

    const code = await UserVerificationCode.create(email)
    const privateKey = Buffer.from(process.env.OIDC_KEYS.split(',')[0], 'base64')

    const token = jwt.sign({
      iss: process.env.PROTOCOL + '://' + process.env.DOMAIN,
      aud: 'https://hylo.com',
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration
      code: code.get('code')
    }, privateKey, { algorithm: 'RS256' });

    Queue.classMethod('Email', 'sendEmailVerification', {
      email,
      version: 'with link',
      templateData: {
        code: code.get('code'),
        verify_url: Frontend.Route.verifyEmail(email, token)
      }
    })

    return res.ok({})
  },

  sendPasswordReset: function (req, res) {
    const email = req.param('email')
    return User.query(q => q.whereRaw('lower(email) = ?', email.toLowerCase())).fetch().then(function (user) {
      if (!user) {
        return res.ok({})
      } else {
        const nextUrl = req.param('evo')
          ? Frontend.Route.evo.passwordSetting()
          : null
        const token = user.generateJWT()
        Queue.classMethod('Email', 'sendPasswordReset', {
          email: user.get('email'),
          templateData: {
            login_url: Frontend.Route.jwtLogin(user, token, nextUrl)
          }
        })
        return res.ok({})
      }
    })
    .catch(res.serverError.bind(res))
  }

}
