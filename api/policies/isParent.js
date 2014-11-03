module.exports = function isParent(req, res, next) {
  if (req.param('parentid') == req.session.user.id) {
    next();
  } else {
    res.forbidden();
  }
};
