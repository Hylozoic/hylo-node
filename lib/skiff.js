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

require('dotenv').load()
const { blue, green, red, yellow } = require('chalk')
if (process.env.NEW_RELIC_LICENSE_KEY) require('newrelic')

require('./rollbar') // must require this to initialize Rollbar
var argv = require('minimist')(process.argv)
var rc = require('rc')
var sails = require('sails')
var _ = require('lodash')

module.exports = {
  sails,
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
      log(yellow('Landing...'))

      opts.stop(function (err) {
        sails.lower()
        if (err) {
          log(red('Done with errors'))
          console.error(err.stack)
        } else {
          log(green('Done'))
        }
      })
    })

    log(yellow('Lifting...'))

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
        log(blue('Aloft.'))
        opts.start(argv)
      } else {
        log(red('opts.start was not set; nothing to do.'))
        process.exit(1)
      }
    })
  }
}
