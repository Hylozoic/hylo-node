require('babel-register') // this must be first
const skiff = require('./lib/skiff') // this must be second
require('./config/kue') // this must be third

const Promise = require('bluebird')
const queue = require('kue').createQueue()
const rollbar = skiff.rollbar
const sails = skiff.sails
const lodash = require('lodash')
const { forIn, omit } = lodash

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
    const { id, data, data: { className, methodName } } = job
    sails.log.debug(`Job ${id}: ${className}.${methodName}`)
    const fn = global[className][methodName]

    // we wrap the method call in a promise so that if it throws an error
    // immediately, e.g. if the method is not a function, the catch below will
    // handle it
    return Promise.resolve()
    .then(() => fn(omit(data, 'className', 'methodName')))
  }
}

var processJobs = function () {
  // load jobs
  forIn(jobDefinitions, function (promise, name) {
    queue.process(name, 10, function (job, ctx, done) {
      // put common behavior for all jobs here

      var label = `Job ${job.id}: `
      sails.log.debug(label + name)

      promise(job).then(function () {
        sails.log.debug(label + 'done')
        done()
      })
      .catch(err => {
        const data = {custom: {jobData: job.data}}
        const error = typeof err === 'string'
          ? new Error(err)
          : (err || new Error('kue job failed without error'))
        sails.log.error(label + error.message.red)
        rollbar.handleErrorWithPayloadData(error, data)
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
