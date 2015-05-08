module.exports = function(req, res, next) {

  Project.find(req.param('projectId')).then(function(project) {

    var pass = function() {
      res.locals.project = project;
      next();
    }

    var fail = function(log) {
      sails.log.debug('policy: checkAndSetProject: ' + log);
      res.forbidden();
    }

    // TODO passthrough for valid invitation links

    if (project.isDraft()) {
      if (req.session.userId === project.get('user_id')) {
        // you're the creator
        pass();
      } else {
        fail('no access to draft');
        // TODO you're a participant
      }
    } else {
      if (project.isPublic()) {
        // it's published and public
        pass();
      } else {
        Membership.find(req.session.userId, project.get('community_id')).then(function() {
          membership ? pass() : res.forbidden('not in community');
        });
      }
    }

  })
  .catch(res.serverError.bind(res));

};