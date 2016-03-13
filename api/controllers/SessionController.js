const passport = require('passport')
const rollbar = require('rollbar')

const findUser = function (service, email, id) {
  return User.query(function (qb) {
    qb.where('users.active', true)

    qb.leftJoin('linked_account', function () {
      this.on('linked_account.user_id', '=', 'users.id')
    })

    qb.where(function () {
      this.where({provider_user_id: id, 'linked_account.provider_key': service})
      .orWhere('email', email)
    })
  }).fetchAll({withRelated: ['linkedAccounts']})
  .then(users => {
    // if we find both a user matching the email address and one with a matching
    // linked account, prioritize the latter
    if (users.length >= 2) {
      return users.find(u => _.some(u.relations.linkedAccounts.models, a =>
        a.get('provider_user_id') === id && a.get('provider_key') === service))
    }
    return users.first()
  })
}

const hasLinkedAccount = function (user, service) {
  return !!user.relations.linkedAccounts.where({provider_key: service})[0]
}

const findCommunity = function (req) {
  if (!req.session.invitationId) return Promise.resolve([null, null])

  return Invitation.find(req.session.invitationId, {withRelated: ['community']})
  .then(function (invitation) {
    return [invitation.relations.community, invitation]
  })
}

const upsertUser = (req, service, profile) => {
  return findUser(service, profile.email, profile.id)
  .then(user => {
    if (user) {
      return UserSession.login(req, user, service)
      // if this is a new account, link it to the user
      .tap(() => hasLinkedAccount(user, service) ||
        LinkedAccount.create(user.id, {type: service, profile}, {updateUser: true}))
    }

    return findCommunity(req)
    .spread((community, invitation) => {
      const attrs = _.merge(_.pick(profile, 'email', 'name'), {
        community: (invitation ? null : community),
        account: {type: service, profile}
      })

      return User.createFully(attrs, invitation)
    })
    .tap(user => UserSession.login(req, user, service))
  })
}

const upsertLinkedAccount = (req, service, profile) => {
  var userId = req.session.userId
  return LinkedAccount.where({provider_key: service, provider_user_id: profile.id}).fetch()
  .then(account => {
    if (account) {
      // user has this linked account already
      if (account.get('user_id') === userId) return
      // linked account belongs to someone else -- change its ownership
      return account.save({user_id: userId}, {patch: true})
      .then(() => LinkedAccount.updateUser(userId, {type: service, profile}))
    }

    // we create a new account regardless of whether one exists for the service;
    // this allows the user to continue to log in with the old one
    return LinkedAccount.create(userId, {type: service, profile}, {updateUser: true})
  })
}

const finishOAuth = function (strategy, req, res, next) {
  var service = strategy
  if (strategy === 'facebook-token') {
    service = 'facebook'
  } else if (strategy === 'google-token') {
    service = 'google'
  } else if (strategy === 'linkedin-token') {
    service = 'linkedin'
  }

  return new Promise((resolve, reject) => {
    var respond = error => {
      if (error && error.stack) rollbar.handleError(e, req)

      return resolve(res.view('popupDone', {
        error,
        context: req.session.authContext || 'oauth',
        layout: null,
        returnDomain: req.session.returnDomain
      }))
    }

    var authCallback = function (err, profile, info) {
      if (err || !profile) return respond(err || 'no user')

      return (UserSession.isLoggedIn(req)
        ? upsertLinkedAccount
        : upsertUser)(req, service, profile)
      .then(() => UserExternalData.store(req.session.userId, service, profile._json))
      .then(() => respond())
      .catch(respond)
    }

    passport.authenticate(strategy, authCallback)(req, res, next)
  })
}

// save params into session variables so that they can be used to return to the
// right control flow
const setSessionFromParams = fn => (req, res) => {
  req.session.returnDomain = req.param('returnDomain')
  req.session.authContext = req.param('authContext')
  return fn(req, res)
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

  startGoogleOAuth: setSessionFromParams(function (req, res) {
    passport.authenticate('google', {scope: 'email'})(req, res)
  }),

  finishGoogleOAuth: function (req, res, next) {
    return finishOAuth('google', req, res, next)
  },

  startFacebookOAuth: setSessionFromParams(function (req, res) {
    passport.authenticate('facebook', {
      display: 'popup',
      scope: ['email', 'public_profile', 'user_friends']
    })(req, res)
  }),

  finishFacebookOAuth: function (req, res, next) {
    return finishOAuth('facebook', req, res, next)
  },

  finishFacebookTokenOAuth: function (req, res, next) {
    return finishOAuth('facebook-token', req, res, next)
  },

  finishGoogleTokenOAuth: function (req, res, next) {
    return finishOAuth('google-token', req, res, next)
  },

  startLinkedinOAuth: setSessionFromParams(function (req, res) {
    passport.authenticate('linkedin')(req, res)
  }),

  finishLinkedinOauth: function (req, res, next) {
    return finishOAuth('linkedin', req, res, next)
  },

  finishLinkedinTokenOauth: function (req, res, next) {
    return finishOAuth('linkedin-token', req, res, next)
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
      if (!user) return res.status(422).send('No user id')

      return Promise.join(user, user.checkToken(req.param('t')))
    })
    .spread((user, match) => {
      if (match) {
        UserSession.login(req, user, 'password')
        return res.redirect(nextUrl)
      }

      if (req.param('n')) {
        // still redirect, to give the user a chance to log in manually
        res.redirect(nextUrl)
      } else {
        res.status(422).send("Token doesn't match")
      }
    })
    .catch(res.serverError)
  },

  findUser // this is here for testing
}
