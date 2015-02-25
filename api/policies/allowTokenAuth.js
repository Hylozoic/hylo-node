module.exports = function(req, res, next) {

  if (TokenAuth.isValid(req.param('auth_token'))) {
    TokenAuth.setAuthenticated(res);
  }

  next();
};