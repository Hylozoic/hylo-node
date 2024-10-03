/* globals Nexudus */
require("@babel/register")
var skiff = require('./lib/skiff') // this must be required first
var moment = require('moment-timezone')
var rollbar = require('./lib/rollbar')
var sails = skiff.sails
var digest2 = require('./lib/group/digest2')
var Promise = require('bluebird')
var { red } = require('chalk')
const savedSearches = require('./lib/group/digest2/savedSearches')

const sendAndLogDigests = type =>
  digest2.sendAllDigests(type)
  .then(results => { sails.log.debug(`Sent digests to: ${results}`); return results })

const sendSavedSearchDigests = userId =>
  savedSearches.sendAllDigests(userId)

const resendInvites = () =>
  Invitation.resendAllReady()
  .then(results => { sails.log.debug(`Resent the following invites: ${results}`); return results })

// Currently Nexudus updates are disabled
// const updateFromNexudus = opts =>
//   Nexudus.updateAllCommunities(opts)
//   .then(report => sails.log.debug('Updated users from Nexudus:', report))

const daily = now => {
  const tasks = []

  sails.log.debug('Removing old kue jobs')
  tasks.push(Queue.removeOldJobs('complete', 20000))

  sails.log.debug('Removing old notifications')
  tasks.push(Notification.removeOldNotifications())

  switch (now.day()) {
    case 3:
      sails.log.debug('Sending weekly digests')
      tasks.push(sendAndLogDigests('weekly'))
      tasks.push(sendSavedSearchDigests('weekly'))
      break
  }
  return tasks
}

const hourly = now => {
  // Currently nexudus updates are disabled. To enable, uncomment here and definition at top of this file.
  // const tasks = [
  //   updateFromNexudus({dryRun: false})
  // ]

  const tasks = []

  switch (now.hour()) {
    case 12:
      sails.log.debug('Sending daily digests')
      tasks.push(sendAndLogDigests('daily'))
      tasks.push(sendSavedSearchDigests('daily'))
      break
    case 13:
      sails.log.debug('Resending invites')
      tasks.push(resendInvites())
      break
  }

  return tasks
}

const every10minutes = now => {
  sails.log.debug('Refreshing full-text search index, sending comment digests, updating member counts, and updating proposal statuses')
  return [
    FullTextSearch.refreshView(),
    Comment.sendDigests().then(count => sails.log.debug(`Sent ${count} comment/message digests`)),
    Group.updateAllMemberCounts(),
    Post.updateProposalStatuses()
  ]
}

var runJob = Promise.method(name => {
  const job = {hourly, daily, every10minutes}[name]
  if (typeof job !== 'function') {
    throw new Error(`Unknown job name: "${name}"`)
  }
  sails.log.debug(`Running ${name} job`)
  const now = moment.tz('America/Los_Angeles')
  return Promise.all(job(now))
})

skiff.lift({
  start: function (argv) {
    runJob(argv.interval)
    .then(function () {
      skiff.lower()
    })
    .catch(function (err) {
      sails.log.error(red(err.message))
      sails.log.error(err)
      rollbar.error(err, () => skiff.lower())
    })
  }
})
