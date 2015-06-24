module.exports = function(req, res, next) {

  Project.find(req.param('projectId')).then(function(project) {
    if (req.session.userId === project.get('user_id') || Admin.isSignedIn(req)) {
      res.locals.project = project;
      next();
    } else {
      res.forbidden();
    }
  })
  .catch(res.serverError.bind(res));

};