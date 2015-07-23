module.exports = function(req, res, next) {

  if (res.locals.project.get('user_id') === req.session.userId)
    return next();

  ProjectMembership.find(req.session.userId, res.locals.project.id)
  .then(membership => {
    if (!membership)
      return res.forbidden();

    if (membership.isModerator() || req.param('type') === 'offer')
      return next();

    res.forbidden();
  });

};
