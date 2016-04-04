var skiff = require('./lib/skiff') // this must be first
require('./config/kue') // this must be second

var _ = require('lodash')
var Promise = require('bluebird')
var queue = require('kue').createQueue()
var rollbar = skiff.rollbar
var sails = skiff.sails

// define new jobs here.
// each job should return a promise.
// use Promise.method if the job is synchronous.
//
// use the classMethod job to run any class method that takes a single hash argument.
//
var jobDefinitions = {
  test: Promise.method(function (job) {
    console.log(new Date().toString().magenta)
    throw new Error('whoops!')
  }),

  classMethod: function (job) {
    sails.log.debug(format('Job %s: %s.%s', job.id, job.data.className, job.data.methodName))
    return global[job.data.className][job.data.methodName](_.omit(job.data, 'className', 'methodName'))
  }
}

var processJobs = function () {
  // load jobs
  _.forIn(jobDefinitions, function (promise, name) {
    queue.process(name, 10, function (job, ctx, done) {
      // put common behavior for all jobs here

      var label = `Job ${job.id}: `
      sails.log.debug(label + name)

      promise(job).then(function () {
        sails.log.debug(label + 'done')
        done()
      })
      .catch(function (err) {
        const error = typeof err === 'string' ? new Error(err) : err
        sails.log.error(label + error.message.red)
        rollbar.handleError(error)
        done(error)
      })
    })
  })
}

setTimeout(() => {
  skiff.lift({
    start: processJobs,
    stop: done => {
      queue.shutdown(5000, done)
    }
  })
}, Number(process.env.DELAY_START || 0) * 1000)
