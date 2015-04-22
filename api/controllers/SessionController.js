var passport = require('passport');

module.exports = {

  create: function(req, res) {
    var email = req.param('email'),
      password = req.param('password');

    return User.authenticate(email, password).then(function(user) {
      UserSession.setup(req, user, 'password');
      return user.save({last_login: new Date()}, {patch: true});
    }).then(function() {
      res.ok({});
    }).catch(function(err) {
      res.status(422).send(err); // well-formed but semantically invalid
    });
  },

  startGoogleOAuth: function(req, res) {
    passport.authenticate('google', {scope: 'email'})(req, res);
  },

  finishGoogleOAuth: function(req, res, next) {
    var done = function(err) {
      res.view('popupDone', {context: 'google', error: err, layout: null});
    };

    // FIXME promisify this plz
    passport.authenticate('google', function(err, profile, info) {
      if (err) { return next(err); }
      if (!profile) { return res.redirect('/h/login'); }

      User.query(function(qb) {
        qb.leftJoin('linked_account', function() {
          this.on('linked_account.user_id', '=', 'users.id');
        });
        qb.where('linked_account.provider_key', 'google');
        qb.where('email', profile.email).orWhere('provider_user_id', profile.id);

      }).fetch({
        withRelated: ['linkedAccounts']
      }).then(function(user) {

        if (user) {
          UserSession.setup(req, user, 'google');

          // if this is a new Google account, link it to the user
          if (!user.relations.linkedAccounts.where({provider_key: 'google'})[0]) {
            LinkedAccount.createForUserWithGoogle(user, profile.id).then(function() {
              done();
            });
          } else {
            done();
          }

        } else {
          if (!req.session.invitationCode) {
            done('no community');
            return;
          }

          // create a new user linked to google
          Community.where({beta_access_code: req.session.invitationCode}).fetch()
          .then(function(community) {
            return bookshelf.transaction(function(trx) {
              return User.create(_.merge(_.pick(profile, 'email', 'name'), {
                account: {google: profile},
                community: community
              }), {transacting: trx});
            });
          })
          .then(function(user) {
            UserSession.setup(req, user, 'google');
            done();
          });
        }

      });
    })(req, res, next);
  },

  destroy: function(req, res) {
    req.session.destroy();
    res.redirect('/');
  }

}