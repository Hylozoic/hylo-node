var skiff = require('./lib/skiff'),
  sails = skiff.sails;

var intervals = {

  daily: function() {

  },

  hourly: function() {

  },

  every10minutes: function() {

  }

}

skiff.lift({
  start: function(argv) {
    sails.log.info('running ' + argv.interval + ' job');
    intervals[argv.interval]();
    skiff.lower();
  }
});
