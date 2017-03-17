module.exports = function (req, res, next) {
  if (Admin.isSignedIn(req)) return next()

  var communityIds = req.param('community_ids')
  var userId = req.session.userId

  if (!communityIds) return next()

  return User.validateMembershipInCommunities(communityIds, userId)
    .then(ok => ok ? next() : res.forbidden())
}
