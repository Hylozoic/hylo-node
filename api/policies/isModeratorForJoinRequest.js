module.exports = function isModeratorForJoinRequest(req, res, next) {
  if (Admin.isSignedIn(req)) return next();
  var joinRequestId = req.param('joinRequestId')
  return CommunityJoinRequest.where({id: joinRequestId}).fetch()
  .then(cjr => {
    var communityId = cjr.get('community_id')
    return Membership.hasModeratorRole(req.session.userId, communityId)
    .then(function(isModerator) {
      if (isModerator) {
        next();
      } else {
        sails.log.debug("policy: isModeratorForJoinRequest: fail for user " + req.session.userId + ", community " + communityId);
        res.forbidden();
      }
    });
  })
};

