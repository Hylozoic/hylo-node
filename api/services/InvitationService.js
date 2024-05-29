const { GraphQLYogaError } = require('@graphql-yoga/node')
import validator from 'validator'
import { TextHelpers } from 'hylo-shared'
import { get, isEmpty, map, merge } from 'lodash/fp'

module.exports = {
  checkPermission: (userId, invitationId) => {
    return Invitation.find(invitationId, {withRelated: 'group'})
    .then(async (invitation) => {
      if (!invitation) throw new GraphQLYogaError('Invitation not found')
      const { group } = invitation.relations
      const user = await User.find(userId)
      return user.get('email') === invitation.get('email') || (GroupMembership.hasResponsibility(userId, group, Responsibility.constants.RESP_ADD_MEMBERS))
    })
  },

  findById: (invitationId) => {
    return Invitation.find(invitationId)
  },

  find: ({groupId, limit, offset, pendingOnly = false, includeExpired = false}) => {
    return Group.find(groupId)
    .then(group => Invitation.query(qb => {
      qb.limit(limit || 20)
      qb.offset(offset || 0)
      qb.where('group_id', group.get('id'))
      qb.leftJoin('users', 'users.id', 'group_invites.used_by_id')
      qb.select(bookshelf.knex.raw(`
        group_invites.*,
        count(*) over () as total,
        users.id as joined_user_id,
        users.name as joined_user_name,
        users.avatar_url as joined_user_avatar_url
      `))

      pendingOnly && qb.whereNull('used_by_id')

      !includeExpired && qb.whereNull('expired_by_id')

      qb.orderBy('created_at', 'desc')
    }).fetchAll({withRelated: ['user']}))
    .then(invitations => ({
      total: invitations.length > 0 ? Number(invitations.first().get('total')) : 0,
      items: invitations.map(i => {
        var user = i.relations.user
        if (isEmpty(user) && i.get('joined_user_id')) {
          user = {
            id: i.get('joined_user_id'),
            name: i.get('joined_user_name'),
            avatar_url: i.get('joined_user_avatar_url')
          }
        }
        return merge(i.pick('id', 'email', 'created_at', 'last_sent_at'), {
          user: !isEmpty(user) ? user.pick('id', 'name', 'avatar_url') : null
        })
      })
    }))
  },

  /**
   *
   * @param sessionUserId
   * @param groupId
   * @param tagName {String}
   * @param userIds {String[]} list of userIds
   * @param emails {String[]} list of emails
   * @param message
   * @param isModerator {Boolean} should invite as moderator (defaults: false)
   * @param subject
   */
  create: ({sessionUserId, groupId, tagName, userIds, emails = [], message, isModerator = false, subject}) => {
    return Promise.join(
      userIds && User.query(q => q.whereIn('id', userIds)).fetchAll(),
      Group.find(groupId),
      tagName && Tag.find({ name: tagName }),
      (users, group, tag) => {
        let concatenatedEmails = emails.concat(map(u => u.get('email'), get('models', users)))

        return Promise.map(concatenatedEmails, email => {
          if (!validator.isEmail(email)) {
            return {email, error: 'not a valid email address'}
          }

          const opts = {
            email,
            userId: sessionUserId,
            groupId: group.id
          }

          if (tag) {
            opts.tagId = tag.id
          } else {
            opts.message = TextHelpers.markdown(message, { disableAutolinking: true })
            opts.moderator = isModerator
            opts.subject = subject
          }

          return Invitation.create(opts)
            .tap(i => i.refresh({withRelated: ['creator', 'group', 'tag']}))
            .then(invitation => {
              return Queue.classMethod('Invitation', 'createAndSend', {invitation})
                .then(() => ({
                  email,
                  id: invitation.id,
                  createdAt: invitation.created_at,
                  lastSentAt: invitation.last_sent_at
                }))
                .catch(err => ({email, error: err.message}))
            })
        })
      })
  },

  /**
   *
   * @param sessionUserId logged in users ID
   * @param groupId
   * @param subject {String} the email subject
   * @param message {String} the email message text
   * @param moderator {Boolean} should invite as moderator
   * @returns {*}
   */
  reinviteAll: ({sessionUserId, groupId, subject = '', message = '', isModerator = false}) => {
    return Queue.classMethod('Invitation', 'reinviteAll', {
      groupId,
      subject,
      message,
      moderator: isModerator,
      userId: sessionUserId
    })
  },

  expire: (userId, invitationId) => {
    return Invitation.find(invitationId)
    .then(invitation => {
      if (!invitation) throw new GraphQLYogaError('not found')

      return invitation.expire(userId)
    })
  },

  resend: (invitationId) => {
    return Invitation.find(invitationId)
    .then(invitation => {
      if (!invitation) throw new GraphQLYogaError('not found')

      return invitation.send()
    })
  },

  check: (token, accessCode) => {
    if (accessCode) {
      return Group.queryByAccessCode(accessCode)
        .count()
        .then(count => {
          return {valid: count !== '0'}
        })
      }
    if (token) {
      return Invitation.query()
        .where({ token, used_by_id: null, expired_by_id: null })
        .count()
        .then(result => {
          return { valid: result[0].count !== '0' }
        })
    }
  },

  async use (userId, token, accessCode) {
    const user = await User.find(userId)
    if (accessCode) {
      return Group.queryByAccessCode(accessCode)
      .fetch()
      .then(group => {
        return GroupMembership.forPair(user, group, {includeInactive: true}).fetch()
        .then(existingMembership => {
          if (existingMembership) {
            return existingMembership.get('active')
              ? existingMembership
              : existingMembership.save({active: true}, {patch: true}).then(membership => {
                Queue.classMethod('Group', 'afterAddMembers', {
                  groupId: group.id,
                  newUserIds: [userId],
                  reactivatedUserIds: [userId]
                })
                return membership
              })
          }
          if (!!group) return user.joinGroup(group, { role: GroupMembership.Role.DEFAULT, fromInvitation: true }).then(membership => membership)
        })
        .catch(err => {
          throw new Error(err.message)
        })
      })
    }

    if (token) {
      return Invitation.where({token}).fetch()
      .then(invitation => {
        if (!invitation) throw new GraphQLYogaError('not found')
        if (invitation.isExpired()) throw new GraphQLYogaError('expired')
        return invitation.use(userId)
      })
    }

    throw new Error('must provide either token or accessCode')
  }
}
