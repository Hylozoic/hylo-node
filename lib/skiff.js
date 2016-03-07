/*
lightweight Sails startup for scripts

usage:
  var skiff = require('skiff')

  skiff.lift({
    start: function(argv) {
      // put the work to be done here.
      // this is called after sails is lifted.
      // argv is the arguments to the script, parsed by minimist.

      // call this to stop running.
      skiff.lower()
    },
    stop: function(done) {
      // optional.
      // do any cleanup work here
      // and call done() when finished.
    }
  })

*/

require('babel-register')
require('dotenv').load()
if (process.env.NEW_RELIC_LICENSE_KEY) require('newrelic')

var rollbar = require('rollbar')
rollbar.init(process.env.ROLLBAR_SERVER_TOKEN)

var argv = require('minimist')(process.argv)
var rc = require('rc')
var sails = require('sails')
var _ = require('lodash')

module.exports = {
  rollbar: rollbar,
  sails: sails,
  lower: () => process.emit('SIGTERM'),
  lift: (opts) => {
    var log = msg => opts.silent || sails.log.info(msg)
    if (!opts.stop) opts.stop = done => done()

    // set up graceful shutdown.
    // these have to be defined outside the "sails lift" callback,
    // otherwise they are overridden by Sails.
    process.on('SIGINT', function () {
      if (!opts.silent) console.log()
      process.emit('SIGTERM')
      return false
    })
    .on('SIGTERM', function () {
      log('Landing...'.yellow)

      opts.stop(function (err) {
        sails.lower()
        if (err) {
          log('Done with errors'.red)
          console.error(err.stack)
        } else {
          log('Done'.green)
        }
      })
    })

    log('Lifting...'.yellow)

    sails.lift(_.merge(rc('sails'), {
      log: _.merge({noShip: true}, opts.log),
      hooks: {http: false, sockets: false, views: false}
    }), function (err) {
      if (err) {
        console.error("Couldn't lift Sails: " + err)
        console.error(err.stack)
        process.exit(1)
      }

      if (opts.start) {
        log('Aloft.'.blue)
        opts.start(argv)
      } else {
        log('opts.start was not set; nothing to do.'.red)
        process.exit(1)
      }
    })
  }
}
