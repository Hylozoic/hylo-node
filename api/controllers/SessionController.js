var format = require('util').format,
  passport = require('passport');

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

var findCommunity = function(code) {
  if (!code) throw 'no community';
  return Community.where({beta_access_code: code}).fetch();
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
    passport.authenticate('google', function(err, profile, info) {
      if (err || !profile) {
        res.view('popupDone', {context: 'google', error: err || 'no user', layout: null});
        return;
      }

      findUser('google', profile.email, profile.id)
      .then(function(user) {
        if (user) {
          UserSession.login(req, user, 'google');

          // if this is a new Google account, link it to the user
          if (!hasLinkedAccount(user, 'google')) {
            return LinkedAccount.createForUserWithGoogle(user, profile.id);
          }
        } else {
          return findCommunity(req.session.invitationCode)
          .then(function(community) {
            return bookshelf.transaction(function(trx) {
              return User.create(_.merge(_.pick(profile, 'email', 'name'), {
                account: {google: profile},
                community: community
              }), {transacting: trx});
            });
          })
          .then(function(user) {
            UserSession.login(req, user, 'google');
          });
        }
      })
      .then(function() {
        res.view('popupDone', {context: 'google', layout: null});
      })
      .catch(function(err) {
        res.view('popupDone', {context: 'google', error: err, layout: null});
      });

    })(req, res, next);
  },

  startFacebookOAuth: function(req, res) {
    passport.authenticate('facebook', {
      display: 'popup',
      scope: ['email', 'public_profile', 'user_friends']
    })(req, res);
  },

  finishFacebookOAuth: function(req, res, next) {
    passport.authenticate('facebook', function(err, profile, info) {
      if (err || !profile) {
        res.view('popupDone', {context: 'facebook', error: err || 'no user', layout: null});
        return;
      }

      sails.log.warn('facebook info', profile);

      findUser('facebook', profile.email, profile.id)
      .then(function(user) {
        if (user) {
          UserSession.login(req, user, 'facebook');
          if (!hasLinkedAccount(user, 'facebook')) {
            return LinkedAccount.createForUserWithFacebook(user, profile.id);
          }
        } else {
          return findCommunity(req.session.invitationCode)
          .then(function(community) {
            return bookshelf.transaction(function(trx) {
              return User.create(_.merge(_.pick(profile, 'email', 'name'), {
                account: {facebook: profile},
                community: community,
                facebook_url: profile.profileUrl,
                avatar_url: format('http://graph.facebook.com/%s/picture?type=large', profile.id)
              }), {transacting: trx});
            });
          })
          .then(function(user) {
            UserSession.login(req, user, 'facebook');
          });
        }
      })
      .then(function() {
        res.view('popupDone', {context: 'facebook', layout: null});
      })
      .catch(function(err) {
        res.view('popupDone', {context: 'facebook', error: err, layout: null});
      });

    })(req, res, next);
  },

  destroy: function(req, res) {
    req.session.destroy();
    res.redirect('/');
  }

}