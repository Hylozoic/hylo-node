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
          .then(invitation =>
            Post.createWelcomePost(req.session.userId, invitation.get('community_id'), trx))
        })
        .then(() => res.ok({}))
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
  }

}
