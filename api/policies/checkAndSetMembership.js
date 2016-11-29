const dummyMembership = {
  save: () => {},
  dummy: true
}

module.exports = function checkAndSetMembership (req, res, next) {
  var communityId = req.param('communityId')
  // if no community id is specified, continue.
  // this is for routes that can be limited to a specific community
  // or performed across all communities a user can access, e.g. search and
  // getting a user's list of followed tags.
  if (!communityId || communityId === 'all') {
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
      TokenAuth.isPermitted(res, community.id)) {
      allowed = true
    }

    // but still look up the actual membership if available, so that things
    // still behave as expected (e.g. in the case of an admin removing their own
    // membership)
    return Membership.find(req.getUserId(), community.id)
    .then(function (membership) {
      if (membership || allowed) {
        res.locals.membership = membership || dummyMembership
        return next()
      } else if (res.locals.publicAccessAllowed) {
        // if public access is allowed we don't set membership; controllers use
        // its absence to determine that they should only show public content
        return next()
      } else if (community.get('network_id') && req.getUserId()) {
        Network.containsUser(community.get('network_id'), req.getUserId())
          .then(contains => contains ? next() : res.forbidden())
      } else {
        sails.log.debug(format('policy: checkAndSetMembership: fail. user %s, community %s',
          req.getUserId(), community.id))
        res.forbidden()
      }
    })
  })
}
