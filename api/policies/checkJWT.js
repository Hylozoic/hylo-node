import passport from 'passport'

module.exports = async (req, res, next) => {
  return passport.authenticate('jwt', { }, async (err, user, info) => {
    if (err) {
      return res.serverError(err, err.message)
    }

    if (user) {
      // Kind of weird we are creating a session from a JWT, but way better than the non expiring, never changing 1 token per user we used to use
      await UserSession.login(req, user, 'jwt')
      return next()
    }

    // TODO: what if they are already logged in as someone else? just take them to the app? to the login screen? login should redirect if logged in already

    if (info) {
      if (req.method === 'GET') {
        return res.redirect('/login?error=invalid-link')
      }
      return res.status(403).send(info)
    }

    // Otherwise, this request did not come from a logged-in user.
    return res.forbidden()
  })(req, res, next)
}
