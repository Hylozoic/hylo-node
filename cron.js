/* globals Nexudus */
require('babel-register')
var skiff = require('./lib/skiff') // this must be required first
var moment = require('moment-timezone')
var rollbar = skiff.rollbar
var sails = skiff.sails
var digest2 = require('./lib/community/digest2')
var Promise = require('bluebird')

require('colors')

const sendAndLogDigests = type =>
  digest2.sendAllDigests(type)
  .tap(results => sails.log.debug(`Sent digests to: ${results}`))

const resendInvites = () =>
  Invitation.resendAllReady()
  .tap(results => sails.log.debug(`Resent the following invites: ${results}`))

const updateFromNexudus = opts =>
  Nexudus.updateAllCommunities(opts)
  .then(report => sails.log.debug('Updated users from Nexudus:', report))

var jobs = {
  daily: function () {
    const now = moment.tz('America/Los_Angeles')
    const tasks = []

    sails.log.debug('Removing old kue jobs')
    tasks.push(Queue.removeOldJobs('complete', 20000))

    switch (now.day()) {
      case 3:
        sails.log.debug('Sending weekly digests')
        tasks.push(sendAndLogDigests('weekly'))
        break
    }
    return Promise.all(tasks)
  },

  hourly: function () {
    const now = moment.tz('America/Los_Angeles')

    const tasks = [
      updateFromNexudus({dryRun: false}),
      process.env.SERENDIPITY_ENABLED && Relevance.cron(1, 'hour')
    ]

    switch (now.hour()) {
      case 12:
        sails.log.debug('Sending daily digests')
        tasks.push(sendAndLogDigests('daily'))
        break
      case 13:
        sails.log.debug('Resending invites')
        tasks.push(resendInvites())
        break
    }

    return Promise.all(tasks)
  },

  every10minutes: function () {
    sails.log.debug('Refreshing full-text search index')
    return Promise.all([
      FullTextSearch.refreshView(),
      Comment.sendMessageDigests()
      .then(count => sails.log.debug(`Sent ${count} message digests`))
    ])
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
      rollbar.handleError(err, () => skiff.lower())
    })
  }
})
