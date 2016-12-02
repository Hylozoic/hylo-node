module.exports = function checkAndDecodeToken (req, res, next) {
  var tokenData
  try {
    tokenData = Email.decodeFormToken(req.param('token'))
  } catch (e) {
    return Promise.resolve(res.serverError(new Error('Invalid token: ' + req.param('token'))))
  }
  res.locals.tokenData = tokenData

  return Promise.resolve(next())
}
