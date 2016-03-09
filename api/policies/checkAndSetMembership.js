const dummyMembership = {
  save: () => {},
  dummy: true
}

module.exports = function checkAndSetMembership (req, res, next) {
  var communityId = req.param('communityId')
  // if no community id is specified, continue.
  // this is for Search, which can be limited to a specific community
  // or performed across all communities a user can access.
  if (!communityId) {
    return next()
  }

  return Community.findActive(communityId)
  .then(community => {
    if (!community) return res.notFound()

    var allowed
    res.locals.community = community

    // in these special cases, make sure that res.locals.membership is set,
    // because controllers will use its existence to distinguish between someone
    // who should see all community content and someone who should see only
    // public content
    if (Admin.isSignedIn(req) ||
      res.locals.publicAccessAllowed ||
      TokenAuth.isPermitted(res, community.id)) {
      allowed = true
    }

    // but still look up the actual membership if available, so that things
    // still behave as expected (e.g. in the case of an admin removing their own
    // membership)
    return Membership.find(req.session.userId, community.id)
    .then(function (membership) {
      if (membership || allowed) {
        res.locals.membership = membership || dummyMembership
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
