module.exports = function isActivityOwner(req, res, next) {

  if (Admin.isSignedIn(req))
    return next();

  if (!req.param('activityId'))
    return forbidden();

  Activity.find(req.param('activityId')).then(function(activity) {
    if (activity.get('reader_id') === req.getUserId()) {
      next();
    } else {
      sails.log.debug("policy: isOwner: fail for user " + req.getUserId());
      res.forbidden();
    }
  });
};
