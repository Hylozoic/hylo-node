module.exports = function isOwner(req, res, next) {

  if (Admin.isSignedIn(req))
    return next();

  if (!req.param('activityId'))
    return next();

  Activity.find(req.param('activityId')).then(function(activity) {
    if (activity.get('reader_id') === req.session.userId) {
      next();
    } else {
      sails.log.debug("policy: isOwner: fail for user " + req.session.userId);
      res.forbidden();
    }
  });
};
