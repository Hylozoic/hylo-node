module.exports = {

  use: function(req, res) {
    Invitation.where({token: req.param('token')}).fetch()
    .then(function(invitation) {
      if (!invitation) {
        return res.ok({error: 'bad link'});
      }

      if (invitation.isUsed()) {
        return res.ok({error: 'used link'});
      }

      if (UserSession.isLoggedIn(req)) {
        return invitation.use(req.session.userId)
        .then(() => res.ok({}))
        .catch(err => {
          if (err.message && err.message.contains('duplicate key value')) {
            return res.ok({error: 'already a member'});
          } else {
            throw err;
          }
        });
      }

      invitation.load('community').then(function() {
        req.session.invitationId = invitation.id;
        res.ok(_.merge(invitation.toJSON(), {
          signup: true
        }));
      });
    })
    .catch(res.serverError);
  }

};