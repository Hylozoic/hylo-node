var TokenAuth = module.exports = {

  isValid: function(token) {
    if (!process.env.KISS_AUTH_TOKEN) return false;
    return token == process.env.KISS_AUTH_TOKEN;
  },

  setAuthenticated: function(res) {
    res.locals.tokenAuthenticated = true;
  },

  isAuthenticated: function(res) {
    return !!res.locals.tokenAuthenticated;
  },

  isPermitted: function(res, communityId) {
    return TokenAuth.isAuthenticated(res) &&
      parseInt(communityId) == parseInt(process.env.KISS_AUTH_COMMUNITY_ID);
  }

};