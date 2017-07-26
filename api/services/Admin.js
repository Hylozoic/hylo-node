module.exports = {
  isSignedIn: function (req) {
    return req.user && !!(req.user.email || '').match(/@hylo\.com$/)
  }
}
