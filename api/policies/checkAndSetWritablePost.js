var format = require('util').format;

module.exports = function checkAndSetWritablePost(req, res, next) {

  Post.find(req.param('postId'))
  .tap(function(post) {
    if (!post) throw new Error(format('Seed %s not found', req.param('postId')));

    return Promise.any([
      Admin.isSignedIn(req),
      post.get('creator_id') == req.session.userId,
      Membership.hasModeratorRole(req.session.userId, req.param('communityId'))
    ]);
  })
  .then(function(post) {
    res.locals.post = post;
    next();
  })
  .catch(function(err) {
    sails.log.debug(format("Fail checkAndSetWritablePost policy %s %s: %s",
      req.session.userId, req.param('postId'), err.message));
    res.forbidden();
  });
};
