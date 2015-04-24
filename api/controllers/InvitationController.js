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
        return invitation.use(req.session.userId).then(function() {
          res.ok({});
        });
      }

      invitation.load('community').then(function() {
        req.session.invitationId = invitation.id;
        res.ok(_.merge(invitation.toJSON(), {
          signup: true
        }));
      });
    })
    .catch(res.serverError.bind(res));
  }

};