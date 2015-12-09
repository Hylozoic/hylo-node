var api = require('sendwithus')(process.env.SENDWITHUS_KEY)
var Promise = require('bluebird')
var sendEmail = Promise.promisify(api.send, api)

var defaultOptions = {
  sender: {
    address: process.env.EMAIL_SENDER,
    name: 'Hylo'
  }
}

var sendSimpleEmail = function (email, templateId, data, extraOptions) {
  return sendEmail(_.merge({}, defaultOptions, {
    email_id: templateId,
    recipient: {address: email},
    email_data: data
  }, extraOptions))
}

module.exports = {
  sendSimpleEmail: sendSimpleEmail,

  sendRawEmail: function (email, data, extraOptions) {
    return sendSimpleEmail(email, 'tem_nt4RmzAfN4KyPZYxFJWpFE', data, extraOptions)
  },

  sendNewProjectPostNotification: function (email, data, extraOptions) {
    return sendSimpleEmail(email, 'tem_bG7zNWk3sqbLKkg2TLcYgE', data, extraOptions)
  },

  sendProjectInvitation: function (email, data) {
    return sendEmail(_.merge({}, defaultOptions, {
      email_id: 'tem_5karBhDbANcCEmrvuuQtgn',
      recipient: {address: email},
      email_data: data,
      sender: {
        name: format('%s (via Hylo)', data.inviter_name),
        reply_to: data.inviter_email
      }
    }))
  },

  sendPasswordReset: function (opts) {
    return sendSimpleEmail(opts.email, 'tem_mccpcJNEzS4822mAnDNmGT', opts.templateData)
  },

  sendInvitation: function (email, data) {
    return sendEmail(_.merge({}, defaultOptions, {
      email_id: 'tem_ZXZuvouDYKKhCrdEWYbEp9',
      recipient: {address: email},
      email_data: data,
      version_name: 'user-edited text',
      sender: {
        name: format('%s (via Hylo)', data.inviter_name),
        reply_to: data.inviter_email
      }
    }))
  },

  sendNewCommentNotification: function (opts) {
    return sendEmail(_.merge({}, defaultOptions, {
      email_id: 'tem_tP6JzrYzvvDXhgTNmtkxuW',
      recipient: {address: opts.email},
      email_data: opts.data,
      version_name: opts.version,
      sender: opts.sender
    }))
  },

  sendPostMentionNotification: function (opts) {
    return sendEmail(_.merge({}, defaultOptions, {
      email_id: 'tem_wXiqtyNzAr8EF4fqBna5WQ',
      recipient: {address: opts.email},
      email_data: opts.data,
      sender: opts.sender
    }))
  },

  sendCommunityDigest: function (opts) {
    return sendSimpleEmail(opts.email, 'tem_rkZiuPHBvLDFrZ6rv8VixH', opts.data)
  },

  sendPostPrompt: function (opts) {
    return sendSimpleEmail(opts.email, 'tem_GoeP9Ac54t66HjVUtKDwYM', opts.data)
  },

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
  }

}
