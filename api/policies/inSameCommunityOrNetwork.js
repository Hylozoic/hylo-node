module.exports = function (req, res, next) {
  if (Admin.isSignedIn(req)) return next()
  const myUserId = req.session.userId
  const theirUserId = req.param('userId')

  if (myUserId === theirUserId) return next()
  if (isNaN(Number(theirUserId))) return res.notFound()

  Membership.inSameCommunity([myUserId, theirUserId])
  .then(same => same ? next()
    : Membership.inSameNetwork(myUserId, theirUserId)
      .then(same => same ? next() : res.forbidden()))
  .catch(res.serverError)
}
