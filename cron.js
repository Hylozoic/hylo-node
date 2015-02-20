
var skiff = require('./lib/skiff'), // this must be required first
  format = require('util').format,
  moment = require('moment-timezone'),
  rollbar = skiff.rollbar,
  sails = skiff.sails,
  Digest = require('./lib/community/digest'),
  Promise = require('bluebird');

require('colors');

var jobs = {

  daily: function() {
    sails.log.debug('noop!');
    return Promise.resolve(null);
  },

  hourly: function() {
    var now = moment.tz('America/Los_Angeles');

    switch (now.hour()) {
      case 12:
        sails.log.debug('Sending daily digests');
        return Digest.sendDaily();
      default:
        return Promise.resolve(null);
    }
  },

  every10minutes: function() {
    sails.log.debug('noop!');
    return Promise.resolve(null);
  }

};

var runJob = Promise.method(function(name) {
  var job = jobs[name];
  if (typeof(job) !== 'function') {
    throw new Error(format('Unknown job name: "%s"', name));
  }
  sails.log.debug(format('Running %s job', name));
  return job();
});

skiff.lift({
  start: function(argv) {
    runJob(argv.interval).then(function() {
      skiff.lower();
    })
    .catch(function(err) {
      sails.log.error(err.message.red);
      rollbar.handleError(err);
      skiff.lower();
    })
  }
});
