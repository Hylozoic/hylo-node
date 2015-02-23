module.exports = {

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