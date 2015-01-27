var _ = require('lodash'),
  colors = require('colors'),
  rc = require('sails/node_modules/rc'),
  sails = require('sails'),
  util = require('util');

sails.log.info("Starting...".green);

(function() {
  sails.lift(_.merge(rc('sails'), {
    log: {
      noShip: true
    },
    hooks: {
      http: false,
      sockets: false,
      views: false
    }
  }), function(err) {
    if (err) {
      console.error("Couldn't lift Sails: " + err);
      process.exit(1);
    }
    listen();
  });

})();

var listen = function() {
  var queue = require('kue').createQueue();

  process.once('SIGTERM', function(sig) {
    queue.shutdown(function(err) {
      sails.log.info("Stopping...".red);
      process.exit(0);
    }, 5000);
  })

  queue.process('test', processTest);

  // check for delayed jobs
  queue.promote(1000);
};

var processTest = function(job, done) {
  console.log(new Date().toString().magenta);
  console.dir(job.data);
  done('whoops');
};
