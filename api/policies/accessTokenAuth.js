module.exports = function(req, res, next) {
  AccessTokenAuth.checkAndSetAuthenticated(req).then(() => next())
}
