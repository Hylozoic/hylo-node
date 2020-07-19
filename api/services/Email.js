const api = require('sendwithus')(process.env.SENDWITHUS_KEY)
const Promise = require('bluebird')
import { curry, merge } from 'lodash'
import { format } from 'util'

const sendEmail = opts => 
  new Promise((resolve, reject) =>
    api.send(opts, (err, resp) => err ? reject(err) : resolve(resp)))

const defaultOptions = {
  sender: {
    address: process.env.EMAIL_SENDER,
    name: 'Hylo'
  }
}

const sendSimpleEmail = function (address, templateId, data, extraOptions) {
  return sendEmail(merge({}, defaultOptions, {
    email_id: templateId,
    recipient: {address},
    email_data: data
  }, extraOptions))
}

const sendEmailWithOptions = curry((templateId, opts) =>
  sendEmail(merge({}, defaultOptions, {
    email_id: templateId,
    recipient: {address: opts.email},
    email_data: opts.data,
    version_name: opts.version,
    sender: opts.sender // expects {name, address}
  })))

module.exports = {
  sendSimpleEmail,

  sendRawEmail: (email, data, extraOptions) =>
    sendSimpleEmail(email, 'tem_nt4RmzAfN4KyPZYxFJWpFE', data, extraOptions),

  sendPasswordReset: opts =>
    sendSimpleEmail(opts.email, 'tem_mccpcJNEzS4822mAnDNmGT', opts.templateData),

  sendInvitation: (email, data) =>
    sendEmailWithOptions('tem_ZXZuvouDYKKhCrdEWYbEp9', {
      email,
      data,
      version: 'DEV-152',
      sender: {
        name: `${data.inviter_name} (via Hylo)`,
        reply_to: data.inviter_email
      }
    }),

  sendTagInvitation: (email, data) =>
    sendEmailWithOptions('tem_tmEEpPvtQ69wGkmf9njCx8', {
      email,
      data,
      version: 'default',
      sender: {
        name: `${data.inviter_name} (via Hylo)`,
        reply_to: data.inviter_email
      }
    }),

  sendAnnouncementNotification: sendEmailWithOptions('tem_xMGgjc4cfHCYDr8gWRKwhdXF'),
  sendNewCommentNotification: sendEmailWithOptions('tem_tP6JzrYzvvDXhgTNmtkxuW'),
  sendPostMentionNotification: sendEmailWithOptions('tem_wXiqtyNzAr8EF4fqBna5WQ'),
  sendJoinRequestNotification: sendEmailWithOptions('tem_9sW4aBxaLi5ve57bp7FGXZ'),
  sendApprovedJoinRequestNotification: sendEmailWithOptions('tem_eMJADwteU3zPyjmuCAAYVK'),
  sendDonationToEmail: sendEmailWithOptions('tem_bhptVWGW6k67tpFtqRDWKTHQ'),  
  sendDonationFromEmail: sendEmailWithOptions('tem_TCgS9xJykShS9mJjwj9Kd3v6'),  
  sendEventInvitationEmail: sendEmailWithOptions('tem_DxG3FjMdcvYh63rKvh7gDmmY'),

  sendMessageDigest: opts =>
    sendEmailWithOptions('tem_xwQCfpdRT9K6hvrRFqDdhBRK',
      Object.assign({version: 'v2'}, opts)),

  sendCommentDigest: opts =>
    sendEmailWithOptions('tem_tP6JzrYzvvDXhgTNmtkxuW',
      Object.assign({version: 'v2'}, opts)),

  postReplyAddress: function (postId, userId) {
    var plaintext = format('%s%s|%s', process.env.MAILGUN_EMAIL_SALT, postId, userId)
    return format('reply-%s@%s', PlayCrypto.encrypt(plaintext), process.env.MAILGUN_DOMAIN)
  },

  decodePostReplyAddress: function (address) {
    var salt = new RegExp(format('^%s', process.env.MAILGUN_EMAIL_SALT))
    var match = address.match(/reply-(.*?)@/)
    var plaintext = PlayCrypto.decrypt(match[1]).replace(salt, '')
    var ids = plaintext.split('|')

    return {postId: ids[0], userId: ids[1]}
  },

  postCreationAddress: function (communityId, userId, type) {
    var plaintext = format('%s%s|%s|', process.env.MAILGUN_EMAIL_SALT, communityId, userId, type)
    return format('create-%s@%s', PlayCrypto.encrypt(plaintext), process.env.MAILGUN_DOMAIN)
  },

  decodePostCreationAddress: function (address) {
    var salt = new RegExp(format('^%s', process.env.MAILGUN_EMAIL_SALT))
    var match = address.match(/create-(.*?)@/)
    var plaintext = PlayCrypto.decrypt(match[1]).replace(salt, '')
    var decodedData = plaintext.split('|')

    return {communityId: decodedData[0], userId: decodedData[1], type: decodedData[2]}
  },

  formToken: function (communityId, userId) {
    var plaintext = format('%s%s|%s|', process.env.MAILGUN_EMAIL_SALT, communityId, userId)
    return PlayCrypto.encrypt(plaintext)
  },

  decodeFormToken: function (token) {
    var salt = new RegExp(format('^%s', process.env.MAILGUN_EMAIL_SALT))
    var plaintext = PlayCrypto.decrypt(token).replace(salt, '')
    var decodedData = plaintext.split('|')

    return {communityId: decodedData[0], userId: decodedData[1]}
  }

}
