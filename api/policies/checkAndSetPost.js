module.exports = function checkAndSetPost(req, res, next) {

  var fail = function(log) {
    sails.log.debug(format('policy: checkAndSetPost: %s', log));
    res.forbidden();
  };

  return Post.find(req.param('postId'))
  .tap(post => {
    if (!post) throw new Error(format('post %s not found', req.param('postId')));
  })
  .then(function(post) {
    res.locals.post = post;

    if (Admin.isSignedIn(req))
      return Promise.resolve(true);

    if (res.locals.publicAccessAllowed && post.isPublicReadable())
      return Promise.resolve(true);

    return Post.isVisibleToUser(post.id, req.session.userId);
  })
  .then(allowed => allowed ? next() : fail('not allowed'))
  .catch(err => fail(err.message));
};
