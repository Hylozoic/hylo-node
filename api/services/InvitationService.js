import validator from 'validator'
import { markdown } from 'hylo-utils/text'
import { get, isEmpty, map, merge } from 'lodash/fp'

module.exports = {

  findById: (invitationId) => {
    return Invitation.find(invitationId)
  },

  find: ({communityId, limit, offset, pendingOnly = false, includeExpired = false}) => {
    return Community.find(communityId)
    .then(community => Invitation.query(qb => {
      qb.limit(limit || 20)
      qb.offset(offset || 0)
      qb.where('community_id', community.get('id'))
      qb.leftJoin('users', 'users.id', 'community_invites.used_by_id')
      qb.select(bookshelf.knex.raw(`
        community_invites.*,
        count(*) over () as total,
        users.id as joined_user_id,
        users.name as joined_user_name,
        users.avatar_url as joined_user_avatar_url
      `))

      pendingOnly && qb.whereNull('used_by_id')

      !includeExpired && qb.whereNull('expired_by_id')

      qb.orderBy('created_at', 'desc')
    }).fetchAll({withRelated: 'user'}))
    .then(invitations => ({
      total: invitations.length > 0 ? Number(invitations.first().get('total')) : 0,
      items: invitations.map(i => {
        var user = i.relations.user.pick('id', 'name', 'avatar_url')
        if (isEmpty(user) && i.get('joined_user_id')) {
          user = {
            id: i.get('joined_user_id'),
            name: i.get('joined_user_name'),
            avatar_url: i.get('joined_user_avatar_url')
          }
        }
        return merge(i.pick('id', 'email', 'created_at', 'last_sent_at'), {
          user: !isEmpty(user) ? user : null
        })
      })
    }))
  },

  /**
   *
   * @param sessionUserId
   * @param communityId
   * @param tagName {String}
   * @param userIds {String[]} list of userIds
   * @param emails {String[]} list of emails
   * @param message
   * @param isModerator {Boolean} should invite as moderator (defaults: false)
   * @param subject
   */
  create: ({sessionUserId, communityId, tagName, userIds, emails = [], message, isModerator = false, subject}) => {
    return Promise.join(
      userIds && User.where('id', 'in', userIds).fetchAll(),
      Community.find(communityId),
      tagName && Tag.find(tagName),
      (users, community, tag) => {
        let concatenatedEmails = emails.concat(map(u => u.get('email'), get('models', users)))

        return Promise.map(concatenatedEmails, email => {
          if (!validator.isEmail(email)) {
            return {email, error: 'not a valid email address'}
          }

          const opts = {
            email,
            userId: sessionUserId,
            communityId: community.id
          }

          if (tag) {
            opts.tagId = tag.id
          } else {
            opts.message = markdown(message)
            opts.moderator = isModerator
            opts.subject = subject
          }

          return Invitation.createAndSend(opts)
          .then((i) => merge(i.pick('id', 'email', 'created_at', 'last_sent_at'), {
            error: null
          }))
          .catch(err => ({email, error: err.message}))
        })
      })
  },

  /**
   *
   * @param sessionUserId logged in users ID
   * @param communityId
   * @param subject {String} the email subject
   * @param message {String} the email message text
   * @param moderator {Boolean} should invite as moderator
   * @returns {*}
   */
  reinviteAll: ({sessionUserId, communityId, subject = '', message = '', isModerator = false}) => {
    return Queue.classMethod('Invitation', 'reinviteAll', {
      communityId,
      subject,
      message,
      moderator: isModerator,
      userId: sessionUserId
    })
  },

  expire: (userId, invitationId) => {
    return Invitation.find(invitationId)
    .then(invitation => {
      if (!invitation) throw new Error('not found')

      return invitation.expire(userId)
    })
  },

  resend: (invitationId) => {
    return Invitation.find(invitationId)
    .then(invitation => {
      if (!invitation) throw new Error('not found')

      return invitation.send()
    })
  }
}
