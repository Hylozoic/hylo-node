module.exports = function(req, res, next) {
  var type = req.param('type');
  if (type == 'request') {
    if (res.locals.project.get('user_id') === req.session.userId) {
      next();
    } else {
      res.forbidden();
    }
  } else if (type == 'offer') {
    ProjectMembership.find(req.session.userId, res.locals.project.id)
    .then(membership => {
      if (membership) {
        next();
      } else {
        res.forbidden();
      }
    });
  } else {
    res.badRequest('missing required parameter "type"');
  }
};