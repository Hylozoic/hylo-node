module.exports = function isMember(req, res, next) {
  Membership.find(req.session.user.id, req.param('id'))
  .then(function(membership) {
    membership ? next() : res.forbidden();
  });
};
