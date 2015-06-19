module.exports = {

  // find data related to onboarding, not an onboarding object
  find: function(req, res) {
    Membership.where('user_id', req.session.userId).fetchAll({withRelated: [
      {community: qb => qb.column('id', 'leader_id', 'name', 'welcome_message', 'avatar_url', 'slug')},
      {'community.leader': qb => qb.column('id', 'name', 'avatar_url')}
    ]})
    .then(memberships => res.ok(memberships.first().relations.community))
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
    .then(function() {
      res.ok({});
    })
    .catch(function(err) {
      res.serverError(err);
    });
  }

};