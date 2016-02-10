module.exports = {
  // find data related to onboarding, not an onboarding object
  find: function (req, res) {
    var fetchOptions = {withRelated: [
      {community: qb => qb.column('id', 'leader_id', 'name', 'welcome_message', 'avatar_url', 'slug')},
      {'community.leader': qb => qb.column('id', 'name', 'avatar_url')}
    ]}

    ;(req.param('communityId')
      ? Community.find(req.param('communityId'))
        .then(community => Membership.find(req.session.userId, community.id, fetchOptions))
      : Membership.lastViewed(req.session.userId).fetch(fetchOptions))
    .then(membership => res.ok(membership.relations.community))
    .catch(res.serverError)
  },

  update: function (req, res) {
    Tour.where({user_id: req.session.userId, type: 'onboarding'}).fetch()
    .then(function (tour) {
      if (req.param('step')) {
        var status = tour.get('status')
        status.step = req.param('step')
        return tour.save({status: status}, {patch: true})
      }
    })
    .then(res.ok)
    .catch(res.serverError)
  }

}
