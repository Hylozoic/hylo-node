import { fetchAndPresentFollowed } from '../services/TagPresenter'

module.exports = {
  show: function (req, res) {
    if (!req.session.userId) return res.ok({})
    const communityId = req.param('communityId')

    return Promise.join(
      User.find(req.session.userId, {withRelated: ['memberships']}),
      communityId && Community.find(communityId),
      (user, community) => (community
        ? fetchAndPresentFollowed(community.id, user.id)
        : Promise.resolve({}))
        .then(leftNavTags => res.ok({
          new_notification_count: user.get('new_notification_count'),
          left_nav_tags: leftNavTags,
          memberships: user.relations.memberships.map(m => ({
            id: m.id,
            new_notification_count: m.get('new_notification_count')
          }))
        })))
  }
}
