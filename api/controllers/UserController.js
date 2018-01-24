module.exports = {
  create: function (req, res) {
    const { name, email, password } = req.allParams()

    return User.create({name, email, account: {type: 'password', password}})
    .tap(user => Analytics.trackSignup(user.id, req))
    .tap(user => req.param('login') && UserSession.login(req, user, 'password'))
    .then(user => {
      if (req.param('resp') === 'user') {
        return res.ok({
          name: user.get('name'),
          email: user.get('email')
        })
      } else {
        return res.ok({})
      }
    })
    .catch(function (err) {
      res.status(422).send(req.__(err.message ? err.message : err))
    })
  },

  status: function (req, res) {
    res.ok({signedIn: UserSession.isLoggedIn(req)})
  },

  sendPasswordReset: function (req, res) {
    var email = req.param('email')
    return User.where('email', email).fetch().then(function (user) {
      if (!user) {
        return res.ok({})
      } else {
        const nextUrl = req.param('evo')
          ? Frontend.Route.evo.passwordSetting()
          : null
        user.generateToken().then(function (token) {
          Queue.classMethod('Email', 'sendPasswordReset', {
            email: user.get('email'),
            templateData: {
              login_url: Frontend.Route.tokenLogin(user, token, nextUrl)
            }
          })
          return res.ok({})
        })
      }
    })
    .catch(res.serverError.bind(res))
  }
}
