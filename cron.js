var skiff = require('./lib/skiff') // this must be required first
var moment = require('moment-timezone')
var rollbar = skiff.rollbar
var sails = skiff.sails
var Digest = require('./lib/community/digest')
var Promise = require('bluebird')

require('colors')

var jobs = {
  daily: function () {
    sails.log.debug('Removing old kue jobs')
    return Queue.removeOldCompletedJobs(10000)
  },

  hourly: function () {
    var now = moment.tz('America/Los_Angeles')
    var tasks = []

    switch (now.hour()) {
      case 12:
        sails.log.debug('Sending daily digests')
        tasks.push(Digest.sendDaily())
        break
      default:
        tasks.push(Relevance.cron(1, 'hour'))
    }

    return Promise.all(tasks)
  },

  every10minutes: function () {
    sails.log.debug('noop!')
    return Promise.resolve(null)
  }

}

var runJob = Promise.method(function (name) {
  var job = jobs[name]
  if (typeof (job) !== 'function') {
    throw new Error(format('Unknown job name: "%s"', name))
  }
  sails.log.debug(format('Running %s job', name))
  return job()
})

skiff.lift({
  start: function (argv) {
    runJob(argv.interval)
      .then(function () {
        skiff.lower()
      })
      .catch(function (err) {
        sails.log.error(err.message.red)
        rollbar.handleError(err)
        skiff.lower()
      })
  }
})
