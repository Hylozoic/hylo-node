module.exports = function checkAndSetMembership (req, res, next) {
  var communityId = req.param('communityId')
  // if no community id is specified, continue.
  // this is for Search, which can be limited to a specific community
  // or performed across all communities a user can access.
  if (!communityId) {
    return next()
  }

  Community.findActive(communityId).then(community => {
    if (!community) {
      return res.notFound()
    }

    var allowed
    res.locals.community = community

    // allow regardless of membership, but also set res.locals.membership
    // so that it can be used in controllers if it exists, ensuring that
    // being signed in as an admin doesn't interfere with normal usage
    if (Admin.isSignedIn(req) || res.locals.publicAccessAllowed) {
      allowed = true
    }

    // no need to set res.locals.membership in this case,
    // because token auth clients do not sign in as users
    if (TokenAuth.isPermitted(res, community.id)) {
      return next()
    }

    Membership.find(req.session.userId, community.id)
      .then(function (membership) {
        if (membership || allowed) {
          res.locals.membership = membership
          next()
        } else if (community.get('network_id') && req.session.userId) {
          Network.containsUser(community.get('network_id'), req.session.userId)
            .then(contains => contains ? next() : res.forbidden())
        } else {
          sails.log.debug(format('policy: checkAndSetMembership: fail. user %s, community %s',
            req.session.userId, community.id))
          res.forbidden()
        }
      })
  })
}
