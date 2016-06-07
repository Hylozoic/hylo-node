module.exports = function isModerator (req, res, next) {
  if (Admin.isSignedIn(req)) return next()
  const communityId = req.param('communityId')
  Membership.hasModeratorRole(req.session.userId, communityId)
  .then(isModerator => {
    if (isModerator) {
      next()
    } else {
      sails.log.debug(`policy: isModerator: fail for user ${req.session.userId}, community ${communityId}`)
      res.forbidden()
    }
  })
}
