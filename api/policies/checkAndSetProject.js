module.exports = function(req, res, next) {

  Project.find(req.param('projectId')).then(project => {

    var pass = () => {
      res.locals.project = project;
      next();
    }

    var fail = log => {
      sails.log.debug('policy: checkAndSetProject: ' + log);
      res.forbidden();
    }

    if (req.param('token')) {
      // you have a valid invitation link
      ProjectInvitation.validate(project.id, req.param('token'))
      .then(valid => valid ? pass() : fail('not a valid token'));

    } else if (req.session.userId === project.get('user_id')) {
      // you're the creator
      pass();

    } else if (project.isDraft()) {
      // you're a contributor
      ProjectMembership.find(req.session.userId, project.id)
      .then(membership => membership ? pass() : fail('not a contributor'));

    } else if (project.isPublic()) {
      // it's published and public
      pass();

    } else {
      // you're a community member
      Membership.find(req.session.userId, project.get('community_id'))
      .then(membership => membership ? pass() : fail('not in community'));
    }

  })
  .catch(res.serverError.bind(res));

};