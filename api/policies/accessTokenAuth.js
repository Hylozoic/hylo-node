module.exports = function(req, res, next) {
  AccessTokenAuth.checkAndSetAuthenticated(req)
  .then(() => next())
  .catch(err => res.serverError(err))
}
