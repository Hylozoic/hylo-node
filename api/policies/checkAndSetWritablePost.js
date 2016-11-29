import { some } from 'lodash'

module.exports = function checkAndSetWritablePost (req, res, next) {
  Post.find(req.param('postId'), {withRelated: [
    {communities: q => q.column('communities.id')}
  ]})
  .tap(post => {
    if (!post) throw new Error(format('post %s not found', req.param('postId')))

    if (Admin.isSignedIn(req) || post.get('user_id') === req.getUserId()) {
      return true
    }

    return Promise.map(post.relations.communities.pluck('id'), id =>
      Membership.hasModeratorRole(req.getUserId(), id))
    .then(moderatorChecks => {
      if (!some(moderatorChecks)) throw new Error('not a moderator')
    })
  })
  .then(function (post) {
    res.locals.post = post
    next()
  })
  .catch(function (err) {
    sails.log.debug(format('Fail checkAndSetWritablePost policy %s %s: %s',
      req.getUserId(), req.param('postId'), err.message))
    res.forbidden()
  })
}
