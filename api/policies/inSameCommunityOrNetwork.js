module.exports = function (req, res, next) {
  if (Admin.isSignedIn(req)) return next()
  const myUserId = req.session.userId
  const theirUserId = req.param('userId')

  if (myUserId === theirUserId) return next()
  if (isNaN(Number(theirUserId))) return res.notFound()

  Promise.reduce([
    () => req.param('check-join-requests') &&
      JoinRequest.isRequesterVisible(myUserId, theirUserId),
    () => Membership.inSameCommunity([myUserId, theirUserId]),
    () => Membership.inSameNetwork(myUserId, theirUserId)
  ], (ok, fn) => ok || fn(), false)
  .then(ok => ok ? next() : res.forbidden())
  .catch(res.serverError)
}
