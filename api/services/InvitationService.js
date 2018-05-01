import validator from 'validator'
import { markdown } from 'hylo-utils/text'
import { get, isEmpty, map, merge } from 'lodash/fp'

module.exports = {
  checkPermission: (userId, invitationId) => {
    return Invitation.find(invitationId, {withRelated: 'community'})
    .then(invitation => {
      if (!invitation) throw new Error('Invitation not found')
      const { community } = invitation.relations
      return GroupMembership.hasModeratorRole(userId, community)
    })
  },

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
      tagName && Tag.find({ name: tagName }),
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

          return Invitation.create(opts)
            .tap(i => i.refresh({withRelated: ['creator', 'community', 'tag']}))
            .then(invitation => {
              return Queue.classMethod('Invitation', 'createAndSend', {invitation})
                .then(() => ({email, id: invitation.id}))
                .catch(err => ({email, error: err.message}))
            })
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
  },

  check: (userId, token, accessCode) => {
    if (accessCode) {
      return Community.queryByAccessCode(accessCode)
      .count()
      .then(count => {
        return {valid: count !== '0'}
      })
    }
    if (token) {
      return Invitation.query()
      .where({token, used_by_id: null})
      .count()
      .then(result => {
        return {valid: result[0].count !== '0'}
      })
    }
  },

  async use (userId, token, accessCode) {
    const user = await User.find(userId)
    if (accessCode) {
      var community
      return Community.queryByAccessCode(accessCode)
      .fetch()
      .tap(c => { community = c })
      .then(() => !!community && user.joinCommunity(community))
      .catch(err => {
        if (err.message && err.message.includes('duplicate key value')) {
          // preexisting = true
          return true
        } else {
          throw new Error(err.message)
        }
      })
      // we get here if the membership was created successfully, or it already existed
      .then(ok => ok && GroupMembership.forPair(user, community, {includeInactive: true}).fetch())
      .then(membership => {
        if (membership && !membership.get('active')) {
          return membership.save({active: true}, {patch: true})
        }
        return membership
      })
    }

    if (token) {
      return Invitation.where({token}).fetch()
      .then(invitation => {
        if (!invitation) throw new Error('not found')
        if (invitation.isExpired()) throw new Error('expired')
        return invitation.use(userId)
      })
    }

    throw new Error('must provide either token or accessCode')
  }
}
