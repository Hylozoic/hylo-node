var passport = require('passport')

var findUser = function (service, email, id) {
  return User.query(function (qb) {
    qb.where('users.active', true)

    qb.leftJoin('linked_account', function () {
      this.on('linked_account.user_id', '=', 'users.id')
    })

    qb.where('email', email).orWhere(function () {
      this.where({provider_user_id: id, 'linked_account.provider_key': service})
    })
  }).fetch({withRelated: ['linkedAccounts']})
}

var hasLinkedAccount = function (user, service) {
  return !!user.relations.linkedAccounts.where({provider_key: service})[0]
}

var findCommunity = function (req) {
  if (!req.session.invitationId) return Promise.resolve([null, null])

  return Invitation.find(req.session.invitationId, {withRelated: ['community']})
  .then(function (invitation) {
    return [invitation.relations.community, invitation]
  })
}

var finishOAuth = function (strategy, req, res, next) {
  var service = strategy
  if (strategy === 'facebook-token') {
    service = 'facebook'
  } else if (strategy === 'google-token') {
    service = 'google'
  } else if (strategy === 'linkedin-token') {
    service = 'linkedin'
  }

  var authCallback = function (err, profile, info) {
    if (err || !profile) {
      res.view('popupDone', {context: 'oauth', error: err || 'no user', layout: null})
      return
    }

    findUser(service, profile.email, profile.id)
    .then(user => {
      if (user) {
        return UserSession.login(req, user, service)
        .tap(() => {
          // if this is a new account, link it to the user
          if (!hasLinkedAccount(user, service)) {
            return LinkedAccount.create(user.id, {type: service, profile: profile})
          }
        })
        .then(() => user)
      } else {
        return findCommunity(req)
          .spread((community, invitation) => {
            var attrs = _.merge(_.pick(profile, 'email', 'name'), {
              community: (invitation ? null : community),
              account: {type: service, profile: profile}
            })

            return User.createFully(attrs, invitation)
          })
          .tap(user => UserSession.login(req, user, service))
      }
    })
    .then(user => UserExternalData.store(user.id, service, profile._json))
    .then(() => res.view('popupDone', {context: 'oauth', layout: null}))
    .catch(err => res.view('popupDone', {context: 'oauth', error: err, layout: null}))
  }

  passport.authenticate(strategy, authCallback)(req, res, next)
}

module.exports = {
  create: function (req, res) {
    var email = req.param('email')
    var password = req.param('password')

    return User.authenticate(email, password)
    .tap(user => UserSession.login(req, user, 'password'))
    .tap(user => user.save({last_login: new Date()}, {patch: true}))
    .tap(user => {
      if (req.param('resp') === 'user') {
        return UserPresenter.fetchForSelf(user.id, Admin.isSignedIn(req))
          .then(attributes => UserPresenter.presentForSelf(attributes, req.session))
          .then(res.ok)
      } else {
        return res.ok({})
      }
    }).catch(function (err) {
      // 422 means 'well-formed but semantically invalid'
      res.status(422).send(err.message)
    })
  },

  startGoogleOAuth: function (req, res) {
    passport.authenticate('google', {scope: 'email'})(req, res)
  },

  finishGoogleOAuth: function (req, res, next) {
    finishOAuth('google', req, res, next)
  },

  startFacebookOAuth: function (req, res) {
    passport.authenticate('facebook', {
      display: 'popup',
      scope: ['email', 'public_profile', 'user_friends']
    })(req, res)
  },

  finishFacebookOAuth: function (req, res, next) {
    finishOAuth('facebook', req, res, next)
  },

  finishFacebookTokenOAuth: function (req, res, next) {
    finishOAuth('facebook-token', req, res, next)
  },

  finishGoogleTokenOAuth: function (req, res, next) {
    finishOAuth('google-token', req, res, next)
  },

  startLinkedinOAuth: function (req, res) {
    passport.authenticate('linkedin')(req, res)
  },

  finishLinkedinOauth: function (req, res, next) {
    finishOAuth('linkedin', req, res, next)
  },

  finishLinkedinTokenOauth: function (req, res, next) {
    finishOAuth('linkedin-token', req, res, next)
  },

  destroy: function (req, res) {
    req.session.destroy()
    res.redirect('/')
  },

  // a 'pure' version of the above for API-only use
  destroySession: function (req, res) {
    req.session.destroy()
    res.ok({})
  },

  createWithToken: function (req, res) {
    var nextUrl = req.param('n') || Frontend.Route.userSettings() + '?expand=password'

    return User.find(req.param('u')).then(function (user) {
      if (!user) {
        res.status(422).send('No user id')
        return
      }

      return Promise.join(user, user.checkToken(req.param('t')))
    })
    .spread(function (user, match) {
      if (match) {
        UserSession.login(req, user, 'password')
        res.redirect(nextUrl)
        return
      }

      if (req.param('n')) {
        // still redirect, to give the user a chance to log in manually
        res.redirect(nextUrl)
      } else {
        res.status(422).send("Token doesn't match")
      }
    })
    .catch(res.serverError)
  }

}
