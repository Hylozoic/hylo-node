var passport = require('passport');

var findUser = function(service, email, id) {
  return User.query(function(qb) {
    qb.leftJoin('linked_account', function() {
      this.on('linked_account.user_id', '=', 'users.id');
    });

    qb.where('email', email).orWhere(function() {
      this.where({provider_user_id: id, 'linked_account.provider_key': service});
    });
  }).fetch({withRelated: ['linkedAccounts']});
};

var hasLinkedAccount = function(user, service) {
  return !!user.relations.linkedAccounts.where({provider_key: service})[0];
};

var findCommunity = function(req) {
  if (!req.session.invitationId) return Promise.resolve([null, null]);

  return Invitation.find(req.session.invitationId, {withRelated: ['community']})
  .then(function(invitation) {
    return [invitation.relations.community, invitation];
  });
};

var finishOAuth = function(service, req, res, next) {
  sails.log("finishOAuth");  
  passport.authenticate(service, function(err, profile, info) {
    if (err || !profile) {
      sails.log("Error:");
      sails.log(err);      
      res.view('popupDone', {context: 'oauth', error: err || 'no user', layout: null});
      return;
    }

    sails.log(profile);
    
    findUser(service, profile.email, profile.id)
    .then(function(user) {
      if (user) {
        UserSession.login(req, user, service);

        // if this is a new account, link it to the user
        if (!hasLinkedAccount(user, service)) {
          return LinkedAccount.create(user.id, {type: service, profile: profile});
        }
      } else {
        return findCommunity(req)
        .spread(function(community, invitation) {
          var attrs = _.merge(_.pick(profile, 'email', 'name'), {
            community: (invitation ? null : community),
            account: {type: service, profile: profile}
          });

          return bookshelf.transaction(function(trx) {
            return User.create(attrs, {transacting: trx}).tap(function(user) {
              return Promise.join(
                Tour.startOnboarding(user.id, {transacting: trx}),
                (invitation ? invitation.use(user.id, {transacting: trx}) : null)
              );
            });
          });
        })
        .then(function(user) {
          UserSession.login(req, user, service);
        });
      }
    })
    .then(function() {
      res.view('popupDone', {context: 'oauth', layout: null});
    })
    .catch(function(err) {
      res.view('popupDone', {context: 'oauth', error: err, layout: null});
    });

  })(req, res, next);
};

module.exports = {

  create: function(req, res) {
    var email = req.param('email'),
      password = req.param('password');

    return User.authenticate(email, password).then(function(user) {
      UserSession.login(req, user, 'password');
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
    finishOAuth('google', req, res, next);
  },

  startFacebookOAuth: function(req, res) {
    passport.authenticate('facebook', {
      display: 'popup',
      scope: ['email', 'public_profile', 'user_friends']
    })(req, res);
  },
  
  finishFacebookOAuth: function(req, res, next) {
    finishOAuth('facebook', req, res, next);
  },

  finishFacebookTokenOAuth: function(req, res, next) {
    sails.log("finishFacebooToken");
    finishOAuth('facebook-token', req, res, next);
  },

  finishGoogleTokenOAuth: function(req, res, next) {
    sails.log("finishGoogleToken");
    finishOAuth('google-token', req, res, next);
  },
  
  startLinkedinOAuth: function(req, res) {
    passport.authenticate('linkedin')(req, res);
  },

  finishLinkedinOauth: function(req, res, next) {
    finishOAuth('linkedin', req, res, next);
  },

  destroy: function(req, res) {
    req.session.destroy();
    res.redirect('/');
  },

  createWithToken: function(req, res) {
    User.find(req.param('u')).then(function(user) {
      if (!user) {
        res.status(422).send("No user id");
        return;
      }

      return Promise.join(user, user.checkToken(req.param('t')));
    })
    .spread(function(user, match) {
      if (!match) {
        res.status(422).send("Token doesn't match");
        return;
      }

      UserSession.login(req, user, 'password');
      res.redirect(Frontend.Route.userSettings() + '?expand=password');
    })
    .catch(res.serverError.bind(res));
  }

}
