import { omitBy, isNil } from 'lodash/fp'

module.exports = {
  // logic for setting up the session when a user logs in
  login: async function (req, user, providerKey) {
    // So when an anonmyous person logs in we generate a new session for them (handles session fixation)
    req.userId = user.id
    console.log("user id ", req.userId)
    const regenerateSession = Promise.promisify(req.session.regenerate, req.session)
    console.log("session ", req.session, req.session.id)
    const session = await regenerateSession()
console.log("session2 ", req.session, req.session.id)
    req.session.authenticated = true
    req.session.userId = user.id
    req.session.userProvider = providerKey
    req.session.version = this.version
console.log("session3 ", req.session, req.session.id)
    req.rollbar_person = user.pick('id', 'name', 'email')

    if (providerKey === 'admin' || providerKey === 'token') return

    if (req.headers['ios-version'] || req.headers['android-version']) {
      const properties = omitBy(isNil, {
        iosVersion: req.headers['ios-version'],
        androidVersion: req.headers['android-version']
      })

      Analytics.track({
        userId: user.id,
        event: 'Login from mobile app',
        properties
      })
    }

    return user.save({ last_login_at: new Date(), active: true }, { patch: true, autoRefresh: true })
  },

  isLoggedIn: function (req) {
    return !!req.session.authenticated && req.session.version === this.version
  },

  // if you change the keys that are added to the session above,
  // change this version number. it will cause existing sessions
  // to get updated.
  //
  // note that if you want to delete a key from existing sessions,
  // you'll have to add "delete req.session.foo"
  //
  version: '4'
}
