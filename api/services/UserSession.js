// logic for setting up the session when a user logs in

module.exports = {
  setup: function(req, user, providerKey) {
    req.session.authenticated = true;
    req.session.userId = user.id;
    req.session.userProvider = providerKey;
    req.rollbar_person = user.pick('id', 'name', 'email');
    req.session.version = this.version;
  },

  // if you change the keys that are added to the session above,
  // change this version number. it will cause existing sessions
  // to get updated.
  //
  // note that if you want to delete a key from existing sessions,
  // you'll have to add "delete req.session.foo"
  //
  version: '3'
}