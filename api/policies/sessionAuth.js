var fail = function (res) {
  sails.log.debug('policy: sessionAuth: fail')

  // sending Unauthorized instead of Forbidden so that this triggers
  // http-auth-interceptor in the Angular app
  res.status(401)
  res.send('Unauthorized')
}

module.exports = function (req, res, next) {
  if (UserSession.isLoggedIn(req)) {
    return next()
  }

  if (res.locals.publicAccessAllowed) {
    sails.log.debug('policy: sessionAuth: publicAccessAllowed')
    return next()
  }

  fail(res)
}
