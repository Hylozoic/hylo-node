module.exports = function checkAndSetMembership(req, res, next) {
  var communityId = req.param('communityId');
  // if no community id is specified, continue.
  // this is for Search, which can be limited to a specific community
  // or performed across all communities a user can access.
  if (!communityId)
    return next();

  Community.find(communityId, {
    withRelated: [
      {leader: qb => qb.column('id', 'name', 'avatar_url')}
    ]
  }).then(function(community) {
    if (!community)
      return res.notFound();

    var allowed;
    res.locals.community = community;

    // allow regardless of membership, but also set res.locals.membership
    // so that it can be used in controllers if it exists, ensuring that
    // being signed in as an admin doesn't interfere with normal usage
    if (Admin.isSignedIn(req)
      || (res.locals.publicAccessAllowed && community.get('allow_public_content')))
      allowed = true;

    // no need to set res.locals.membership in this case,
    // because token auth clients do not sign in as users
    if (TokenAuth.isPermitted(res, communityId))
      return next();

    Membership.find(req.session.userId, communityId)
    .then(function(membership) {
      if (membership || allowed) {
        res.locals.membership = membership;
        next();

      } else {
        sails.log.debug(format("policy: checkAndSetMembership: fail. user %s, community %s",
          req.session.userId, communityId));
        res.forbidden();
      }
    });
  });

};
