import validator from 'validator'
import { markdown } from 'hylo-utils/text'
import { get, isEmpty, map } from 'lodash/fp'
import { presentForList } from '../presenters/UserPresenter'

const parseEmailList = emails =>
  (emails || '').split(/,|\n/).map(email => {
    var trimmed = email.trim()
    // use only the email portion of a "Joe Bloggs <joe@bloggs.org>" line
    var match = trimmed.match(/.*<(.*)>/)
    return match ? match[1] : trimmed
  })

// this should match how UserPresenter shows the user's memberships (TODO: DRY)
const present = membership => Object.assign(membership.toJSON(), {
  community: membership.relations.community.pick('id', 'slug', 'name', 'avatar_url')
})

module.exports = {
  findOne: function (req, res) {
    return Invitation.find(req.param('token'), {withRelated: 'community'})
    .then(invitation => {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      return res.ok(invitation.relations.community.pick('id', 'name', 'slug', 'avatar_url'))
    })
  },

  use: function (req, res) {
    const userId = req.getUserId()
    return Invitation.find(req.param('token'), {withRelated: 'tag'})
    .then(invitation => {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      if (invitation.isUsed() && userId !== invitation.get('used_by_id')) {
        return res.status(422).send('used token')
      }

      return invitation.use(userId)
      .then(membership => membership.load('community'))
      .then(present)
      .then(res.ok)
      .catch(res.serverError)
    })
  },

  find: function (req, res) {
    return Community.find(req.param('communityId'))
    .then(community => Invitation.query(qb => {
      qb.limit(req.param('limit') || 20)
      qb.offset(req.param('offset') || 0)
      qb.where('community_id', community.get('id'))
      qb.leftJoin('users', 'users.id', 'community_invites.used_by_id')
      qb.select(bookshelf.knex.raw(`
        community_invites.*,
        count(*) over () as total,
        users.id as joined_user_id,
        users.name as joined_user_name,
        users.avatar_url as joined_user_avatar_url
      `))
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
        return _.merge(i.pick('id', 'email', 'created_at'), {
          user: !isEmpty(user) ? user : null
        })
      })
    }))
    .then(res.ok)
  },

  create: function (req, res) {
    let tagName = req.param('tagName')
    const userIds = req.param('users')
    return Promise.join(
      userIds && User.where('id', 'in', userIds).fetchAll(),
      Community.find(req.param('communityId')),
      tagName && Tag.find(tagName),
      (users, community, tag) => {
        return tag
        ? TagFollow.findFollowers(community.id, tag.id, 3)
        : Promise.resolve([])
        .then(participants => {
          var emails = parseEmailList(req.param('emails'))
          .concat(map(u => u.get('email'), get('models', users)))

          return Promise.map(emails, email => {
            if (!validator.isEmail(email)) {
              return {email, error: 'not a valid email address'}
            }

            const opts = {
              email,
              userId: req.getUserId(),
              communityId: community.id
            }

            if (tag) {
              opts.tagId = tag.id
              opts.participants = map(u => presentForList(u, {tags: true}), participants)
            } else {
              opts.message = markdown(req.param('message'))
              opts.moderator = req.param('moderator')
              opts.subject = req.param('subject')
            }

            return Invitation.createAndSend(opts)
            .then(() => ({email, error: null}))
            .catch(err => ({email, error: err.message}))
          })
        })
      })
    .then(results => res.ok({results}))
  },

  reinviteAll: function (req, res) {
    return Queue.classMethod('Invitation', 'reinviteAll', {
      communityId: res.locals.community.id,
      subject: req.param('subject'),
      message: req.param('message'),
      moderator: req.param('moderator'),
      userId: req.getUserId()
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  }
}
