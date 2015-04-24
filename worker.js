var skiff = require('./lib/skiff'); // this must be first
require('./config/kue'); // this must be second

var _ = require('lodash'),
  colors = require('colors'),
  Promise = require('bluebird'),
  queue = require('kue').createQueue(),
  rollbar = skiff.rollbar,
  sails = skiff.sails,
  util = require('util');

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

  'Comment.sendNotificationEmail': function(job) {
    return Comment.sendNotificationEmail(job.data.recipientId, job.data.commentId, job.data.version);
  },

  'Post.sendNotificationEmail': function(job) {
    return Post.sendNotificationEmail(job.data.recipientId, job.data.seedId);
  },

  'Email.sendCommunityDigest': function(job) {
    return Email.sendCommunityDigest(job.data.emailData);
  },

  'Email.sendPasswordReset': function(job) {
    return Email.sendPasswordReset(job.data);
  }

};

var processJobs = function() {

  // load jobs
  _.forIn(jobDefinitions, function(promise, name) {
    queue.process(name, 10, function(job, done) {

      // put common behavior for all jobs here

      var label = util.format(' Job %s ', job.id).bgBlue.black + ' ';
      sails.log.debug(label + name);

      promise(job).then(function() {
        sails.log.debug(label + 'done'.green);
        done();
      })
      .catch(function(err) {
        sails.log.error(label + err.message.red);
        rollbar.handleError(err);
        done(err);
      });

    });
  });

  // check for delayed jobs to enqueue.
  // this must be run in only one process to avoid a race condition:
  // https://github.com/learnboost/kue#delayed-jobs
  queue.promote(2000);
};

skiff.lift({
  start: processJobs,
  stop: function(done) {
    queue.shutdown(done, 5000);
  }
});