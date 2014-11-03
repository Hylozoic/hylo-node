module.exports = function isSelf(req, res, next) {
  if (req.param('id') == req.session.user.id) {
    next();
  } else {
    res.forbidden();
  }
};
