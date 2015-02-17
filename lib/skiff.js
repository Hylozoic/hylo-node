/*
lightweight Sails startup for scripts

usage:
  var skiff = require('skiff');

  skiff.lift({
    start: function(argv) {
      // put the work to be done here.
      // this is called after sails is lifted.
      // argv is the arguments to the script, parsed by minimist.

      // call this to stop running.
      skiff.lower();
    },
    stop: function(done) {
      // optional.
      // do any cleanup work here
      // and call done() when finished.
    }
  });

*/

require('dotenv').load();
if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}

var rollbar = require('rollbar');
rollbar.init(process.env.ROLLBAR_SERVER_TOKEN);

var argv = require('minimist')(process.argv),
  rc = require('rc'),
  sails = require('sails'),
  _ = require('lodash');

module.exports = {
  rollbar: rollbar,
  sails: sails,
  lower: function() {
    process.emit('SIGTERM');
  },
  lift: function(opts) {
    if (!opts.stop) {
      opts.stop = function(done) {
        done();
      }
    }

    // set up graceful shutdown.
    // these have to be defined outside the "sails lift" callback,
    // otherwise they are overridden by Sails.
    process.on('SIGINT', function() {
      console.log();
      process.emit('SIGTERM');
      return false;
    })
    .on('SIGTERM', function() {
      sails.log.info("Landing...".yellow);
      opts.stop(function(err) {
        sails.lower();
        sails.log.info("Done".green);
      });
    });

    sails.log.info("Lifting...".yellow);
    sails.lift(_.merge(rc('sails'), {
      log: {noShip: true},
      hooks: {http: false, sockets: false, views: false}
    }), function(err) {
      if (err) {
        console.error("Couldn't lift Sails: " + err);
        process.exit(1);
      }

      sails.log.info('Aloft.'.blue);
      if (opts.start) opts.start(argv);
    });

  }
}
