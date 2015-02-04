var _ = require('lodash'),
  colors = require('colors'),
  Promise = require('bluebird'),
  rc = require('rc'),
  sails = require('sails'),
  util = require('util');

// define new jobs here.
// each job should return a promise.
// use Promise.method if the job is synchronous.
var jobDefinitions = {
  'test': Promise.method(function(job) {
    console.log(new Date().toString().magenta);
    console.dir(job.data);
    throw new Error('whoops!');
  }),

  'Comment.sendNotificationEmail': function(job) {
    return Comment.sendNotificationEmail(job.data.recipientId, job.data.commentId, job.data.version);
  }
};

sails.log.info("Lifting...".yellow);

var Worker = function() {
  this.queue = require('kue').createQueue();
};

Worker.prototype.start = function() {
  var queue = this.queue;

  // load jobs
  _.forIn(jobDefinitions, function(promise, name) {
    queue.process(name, function(job, done) {

      // put common behavior for all jobs here
      sails.log.info(util.format('Job %s: %s', job.id, name));
      promise(job).then(function() { done(); }).catch(done);

    });
  });

  // check for delayed jobs to enqueue.
  // this must be run in only one process to avoid a race condition:
  // https://github.com/learnboost/kue#delayed-jobs
  worker.queue.promote(2000);
};

var worker = new Worker();

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
  worker.queue.shutdown(function(err) {
    sails.lower();
    sails.log.info("Done".green);
  }, 5000);
});

// go!
sails.lift(_.merge(rc('sails'), {
  log: {noShip: true},
  hooks: {http: false, sockets: false, views: false}
}), function(err) {
  if (err) {
    console.error("Couldn't lift Sails: " + err);
    process.exit(1);
  }

  worker.start();
  sails.log.info('Aloft.'.blue);
});
