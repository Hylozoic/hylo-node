require("@babel/register") // this must be first
const skiff = require('./lib/skiff') // this must be second
require('./config/kue') // this must be third

const Promise = require('bluebird')
const lodash = require('lodash')
const rollbar = require('./lib/rollbar')
const sails = skiff.sails
const { omit, throttle } = lodash
const kue = require('kue')

// define new jobs here.
// each job should return a promise.
// use Promise.method if the job is synchronous.
//
// use the classMethod job to run any class method that takes a single hash argument.
//
const jobDefinitions = {
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

let queue = kue.createQueue()
queue.on('error', handleRedisError)

function setupQueue (name, handler) {
  queue.process(name, 10, async (job, ctx, done) => {
    // put common behavior for all jobs here

    var label = `Job ${job.id}: `
    sails.log.debug(label + name)

    try {
      await handler(job)
      sails.log.debug(label + 'done')
      done()
    } catch (err) {
      const data = {jobId: job.id, jobData: job.data}
      const error = typeof err === 'string'
        ? new Error(err)
        : (err || new Error('kue job failed without error'))
      sails.log.error(label + error.message.red, error)
      rollbar.error(error, null, data)
      done(error)
    }
  })
}

const throttledLog = throttle(error => {
  if (rollbar.disabled) {
    sails.log.error(error.message)
  } else {
    rollbar.error(error)
  }
}, 30000)

function handleRedisError (err) {
  if (err && err.message && err.message.includes('Redis connection')) {
    throttledLog(err)
  }
}

setTimeout(() => {
  skiff.lift({
    start: () => {
      for (let name in jobDefinitions) {
        setupQueue(name, jobDefinitions[name])
      }
    },
    stop: done => {
      queue.shutdown(5000, done)
    }
  })
}, Number(process.env.DELAY_START || 0) * 1000)
