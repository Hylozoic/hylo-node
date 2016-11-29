module.exports = function(req, res, next) {
  TokenAuth.checkAndSetAuthenticated(req).then(() => next())
}
