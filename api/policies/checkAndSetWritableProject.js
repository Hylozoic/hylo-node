module.exports = function(req, res, next) {

  Project.find(req.param('projectId')).then(project => {
    var pass = function() {
      res.locals.project = project;
      next();
    };

    if (req.session.userId === project.get('user_id') || Admin.isSignedIn(req)) {
      pass();
    } else {
      ProjectMembership.find(req.session.userId, req.param('projectId'))
      .then(ms => ms && ms.isModerator() ? pass() : res.forbidden);
    }
  })
  .catch(res.serverError);

};
