
var skiff = require('./lib/skiff'), // this must be required first
  moment = require('moment-timezone'),
  rollbar = skiff.rollbar,
  sails = skiff.sails,
  Digest = require('./lib/community/digest');

require('colors');

var intervals = {

  daily: function() {
    sails.log.debug('noop!');
  },

  hourly: function() {
    var now = moment.tz('America/Los_Angeles');

    switch (now.hour()) {
      case 12:
        sails.log.debug('Sending daily digests');
        Digest.sendDaily();
        break;
    }
  },

  every10minutes: function() {
    sails.log.debug('noop!');
  }

};

skiff.lift({
  start: function(argv) {
    try {
      sails.log.debug('running ' + argv.interval + ' job');
      intervals[argv.interval]();
    } catch(err) {
      sails.log.error(err.message.red);
      rollbar.handleError(err);
    }

    skiff.lower();
  }
});
