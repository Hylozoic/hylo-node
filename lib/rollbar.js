var rollbar = require('rollbar')

if (process.env.ROLLBAR_SERVER_TOKEN) {
  rollbar.init({
    accessToken: process.env.ROLLBAR_SERVER_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true
  })
  module.exports = rollbar
} else {
  console.log('Rollbar disabled (process.env.ROLLBAR_SERVER_TOKEN undefined)')
  module.exports = {
    error (err, callback) { // eslint-disable-line
      // do nothing
      if (typeof callback === 'function') callback()
    },

    errorHandler () {
      return null
    }
  }
}
