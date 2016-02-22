module.exports = function (req, res, next) {
  res.locals.publicAccessAllowed = true
  next()
}
