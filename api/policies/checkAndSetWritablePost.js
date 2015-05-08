module.exports = function checkAndSetWritablePost(req, res, next) {

  Post.find(req.param('postId'), {withRelated: [{communities: function(qb) { qb.column('id'); }}]})
  .tap(function(post) {
    if (!post) throw new Error(format('post %s not found', req.param('postId')));

    if (Admin.isSignedIn(req) || post.get('creator_id') == req.session.userId)
      return true;

    var communityId = post.relations.communities.first().id;
    return Membership.hasModeratorRole(req.session.userId, communityId).then(function(isModerator) {
      if (!isModerator) throw 'not a moderator';
    });
  })
  .then(function(post) {
    res.locals.post = post;
    next();
  })
  .catch(function(err) {
    sails.log.debug(format("Fail checkAndSetWritablePost policy %s %s: %s",
      req.session.userId, req.param('postId'), err));
    res.forbidden();
  });
};
