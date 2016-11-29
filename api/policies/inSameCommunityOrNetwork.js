module.exports = function (req, res, next) {
  if (Admin.isSignedIn(req)) return next()

  if (req.getUserId() === req.param('userId')) return next()
  if (isNaN(Number(req.param('userId')))) return res.notFound()

  Membership.inSameCommunity([req.getUserId(), req.param('userId')])
  .then(same => {
    if (same) return next()

    return Membership.inSameNetwork(req.getUserId(), req.param('userId'))
    .then(same => (same ? next() : res.forbidden()))
  })
  .catch(res.serverError)
}
