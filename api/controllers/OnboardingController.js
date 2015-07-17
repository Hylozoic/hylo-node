module.exports = {

  // find data related to onboarding, not an onboarding object
  find: function(req, res) {
    Membership.lastViewed(req.session.userId).fetch({withRelated: [
      {community: qb => qb.column('id', 'leader_id', 'name', 'welcome_message', 'avatar_url', 'slug')},
      {'community.leader': qb => qb.column('id', 'name', 'avatar_url')}
    ]})
    .then(membership => res.ok(membership.relations.community))
    .catch(res.serverError);
  },

  update: function(req, res) {
    Tour.where({user_id: req.session.userId, type: 'onboarding'}).fetch()
    .then(function(tour) {
      if (req.param('step')) {
        var status = tour.get('status');
        status.step = req.param('step');
        return tour.save({status: status}, {patch: true});
      }
    })
    .then(res.ok)
    .catch(res.serverError);
  }

};
