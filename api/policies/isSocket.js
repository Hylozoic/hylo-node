module.exports = function (req, res, next) {
  if (!req.isSocket) {
    return res.badRequest();
  }
  // socket requests don't pass through the http middleware, which defines req.getUserId in most instances
  req.getUserId = () => req.token ? req.token.userId : req.session ? req.session.userId : undefined
  next()
}
