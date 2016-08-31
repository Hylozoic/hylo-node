module.exports = function (req, res, next) {
  if (!req.isSocket) {
    return res.badRequest();
  }
  next()
}
