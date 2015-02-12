var skiff = require('./lib/skiff'),
  sails = skiff.sails;

skiff.lift({
  start: function(argv) {
    sails.log.info('interval: ' + argv.interval);
    skiff.lower();
  }
});
