import validator from 'validator'
import { markdown } from 'hylo-utils/text'

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
    return Invitation.where({token: req.param('token')}).fetch({withRelated: 'community'})
    .then(invitation => {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      return res.ok(invitation.relations.community.pick('id', 'name', 'slug', 'avatar_url'))
    })
  },

  use: function (req, res) {
    const { userId } = req.session
    return Invitation.where({token: req.param('token')}).fetch({withRelated: 'tag'})
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
    Community.find(req.param('communityId'))
    .then(community => Invitation.query(qb => {
      qb.limit(req.param('limit') || 20)
      qb.offset(req.param('offset') || 0)
      qb.where('community_id', community.get('id'))
      qb.select(bookshelf.knex.raw('community_invite.*, count(*) over () as total'))
      qb.orderBy('created', 'desc')
    }).fetchAll({withRelated: 'user'}))
    .then(invitations => ({
      total: invitations.length > 0 ? Number(invitations.first().get('total')) : 0,
      items: invitations.map(i => {
        var user = i.relations.user.pick('id', 'name', 'avatar_url')
        return _.merge(i.pick('id', 'email', 'created'), {
          user: !_.isEmpty(user) ? user : null
        })
      })
    }))
    .then(res.ok)
  },

  create: function (req, res) {
    let tagName = req.param('tagName')
    return Promise.join(
      Community.find(req.param('communityId')),
      tagName ? Tag.find(req.param('tagName')) : Promise.resolve(),
      (community, tag) => {
        var emails = parseEmailList(req.param('emails'))

        return Promise.map(emails, email => {
          if (!validator.isEmail(email)) {
            return {email, error: 'not a valid email address'}
          }

          const opts = {
            email,
            userId: req.session.userId,
            communityId: community.id
          }

          if (tag) {
            opts.tagId = tag.id
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
    .then(results => res.ok({results}))
  }
}
