module.exports = function isCommentOwner (req, res, next) {
  if (Admin.isSignedIn(req)) return next()

  if (!req.param('commentId')) return res.forbidden()

  Comment.find(req.param('commentId'), {withRelated: [
    {'post.communities': q => q.column('communities.id')}
  ]}).then(comment => {
    if (comment.get('user_id') === req.getUserId()) return next()

    Membership.hasModeratorRole(req.getUserId(), comment.community().id).then(function (isModerator) {
      if (isModerator) {
        next()
      } else {
        sails.log.debug('policy: isCommentOwner: fail for user ' + req.getUserId())
        res.forbidden()
      }
    })
  })
}
