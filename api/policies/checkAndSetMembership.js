var format = require('util').format;

module.exports = function checkAndSetMembership(req, res, next) {
  var communityId = req.param('communityId');
  // if no community id is specified, continue.
  // this is for Search, which can be limited to a specific community
  // or performed across all communities a user can access.
  if (!communityId)
    return next();

  Community.find(communityId, {
    withRelated: [
      {leader: function(qb) { qb.column('id', 'name', 'avatar_url'); }}
    ]
  }).then(function(community) {
    if (!community)
      return res.notFound();

    res.locals.community = community;

    if (Admin.isSignedIn(req)
      || TokenAuth.isPermitted(res, communityId)
      || (res.locals.publicAccessAllowed && community.get('allow_public_content')))
      return next();

    Membership.find(req.session.userId, communityId)
    .then(function(membership) {
      if (membership) {
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
