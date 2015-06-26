var skiff = require('./lib/skiff'); // this must be first
require('./config/kue'); // this must be second

var _ = require('lodash'),
  colors = require('colors'),
  Promise = require('bluebird'),
  queue = require('kue').createQueue(),
  rollbar = skiff.rollbar,
  sails = skiff.sails,
  util = require('util');

sails.role = 'worker';

// define new jobs here.
// each job should return a promise.
// use Promise.method if the job is synchronous.
//
// TODO these job definitions should go elsewhere.
// the common case of queueing a class method could also be handled with
// a single job.
var jobDefinitions = {
  'test': Promise.method(function(job) {
    console.log(new Date().toString().magenta);
    throw new Error('whoops!');
  }),

  'classMethod': function(job) {
    sails.log.debug(format('Job %s: %s.%s', job.id, job.data.className, job.data.methodName));
    return global[job.data.className][job.data.methodName](_.omit(job.data, 'className', 'methodName'));
  }

};

var processJobs = function() {

  // load jobs
  _.forIn(jobDefinitions, function(promise, name) {
    queue.process(name, 10, function(job, ctx, done) {

      // put common behavior for all jobs here

      var label = util.format('Job %s: ', job.id);
      sails.log.debug(label + name);

      promise(job).then(function() {
        sails.log.debug(label + 'done');
        done();
      })
      .catch(function(err) {
        sails.log.error(label + err.message.red);
        rollbar.handleError(err);
        done(err);
      });

    });
  });
};

skiff.lift({
  start: processJobs,
  stop: function(done) {
    queue.shutdown(5000, done);
  }
});