var validator = require('validator')

const parseEmailList = emails =>
  (emails || []).split(/,|\n/).map(email => {
    var trimmed = email.trim()
    // use only the email portion of a "Joe Bloggs <joe@bloggs.org>" line
    var match = trimmed.match(/.*<(.*)>/)
    return match ? match[1] : trimmed
  })

module.exports = {
  findOne: function (req, res) {
    return Invitation.where({token: req.param('token')}).fetch({withRelated: 'community'})
    .then(invitation => {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      if (invitation.isUsed()) {
        return res.status(422).send('used token')
      }

      return res.ok(invitation.relations.community.pick('id', 'name', 'slug', 'avatar_url'))
    })
  },

  use: function (req, res) {
    return Invitation.where({token: req.param('token')}).fetch()
    .then(function (invitation) {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      if (invitation.isUsed()) {
        return res.status(422).send('used token')
      }

      // user is logged in; apply the invitation
      if (UserSession.isLoggedIn(req)) {
        return bookshelf.transaction(trx => {
          return invitation.use(req.session.userId, {transacting: trx})
          .tap(membership => Post.createWelcomePost(req.session.userId, invitation.get('community_id'), trx))
        })
        .then(membership => membership.load('community').then(() => res.ok(membership)))
        .catch(err => {
          if (err.message && err.message.includes('duplicate key value')) {
            res.status(422).send('already a member')
          } else {
            throw err
          }
        })
      }

      // return invitation data so that the front-end can store it
      // and re-use it after completing signup or login
      return invitation.load('community').then(function () {
        req.session.invitationId = invitation.id
        res.ok(_.merge(invitation.toJSON(), {
          signup: true
        }))
      })
    })
    .catch(res.serverError)
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
    return Community.find(req.param('communityId'))
    .then(function (community) {
      var emails = parseEmailList(req.param('emails'))

      return Promise.map(emails, function (email) {
        if (!validator.isEmail(email)) {
          return {email, error: 'not a valid email address'}
        }

        return Invitation.createAndSend({
          email,
          userId: req.session.userId,
          communityId: community.id,
          message: RichText.markdown(req.param('message')),
          moderator: req.param('moderator'),
          subject: req.param('subject')
        }).then(function () {
          return {email: email, error: null}
        }).catch(function (err) {
          return {email: email, error: err.message}
        })
      })
    })
    .then(results => res.ok({results: results}))
  }
}
