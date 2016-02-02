module.exports = {
  lookup: function (req, res) {
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
          if (err.message && err.message.contains('duplicate key value')) {
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
      items: invitations.map(invitation => _.merge(invitation.toJSON(), {
        user: invitation.relations.user ? invitation.relations.user.pick('id', 'name', 'avatar_url') : null
      }))
    }))
    .then(res.ok)
  }

}
