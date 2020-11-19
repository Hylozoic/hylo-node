/* globals Nexudus */
require("babel-register");
const skiff = require("./lib/skiff"); // this must be required first
const moment = require("moment-timezone");
const rollbar = require("./lib/rollbar");
const sails = skiff.sails;
const digest2 = require("./lib/community/digest2");
const Promise = require("bluebird");
const { red } = require("chalk");
const savedSearches = require("./lib/community/digest2/savedSearches");

const sendAndLogDigests = (type) =>
  digest2
    .sendAllDigests(type)
    .tap((results) => sails.log.debug(`Sent digests to: ${results}`));

const sendSavedSearchDigests = (userId) => savedSearches.sendAllDigests(userId);

const resendInvites = () =>
  Invitation.resendAllReady().tap((results) =>
    sails.log.debug(`Resent the following invites: ${results}`)
  );

// Currently Nexudus updates are disabled
// const updateFromNexudus = opts =>
//   Nexudus.updateAllCommunities(opts)
//   .then(report => sails.log.debug('Updated users from Nexudus:', report))

const daily = (now) => {
  const tasks = [];

  sails.log.debug("Removing old kue jobs");
  tasks.push(Queue.removeOldJobs("complete", 20000));

  sails.log.debug("Removing old notifications");
  tasks.push(Notification.removeOldNotifications());

  switch (now.day()) {
    case 3:
      sails.log.debug("Sending weekly digests");
      tasks.push(sendAndLogDigests("weekly"));
      tasks.push(sendSavedSearchDigests("weekly"));
      break;
  }
  return tasks;
};

const hourly = (now) => {
  // Currently nexudus updates are disabled. To enable, uncomment here and definition at top of this file.
  // const tasks = [
  //   updateFromNexudus({dryRun: false})
  // ]

  const tasks = [];

  switch (now.hour()) {
    case 12:
      sails.log.debug("Sending daily digests");
      tasks.push(sendAndLogDigests("daily"));
      tasks.push(sendSavedSearchDigests("daily"));
      break;
    case 13:
      sails.log.debug("Resending invites");
      tasks.push(resendInvites());
      break;
  }

  return tasks;
};

const every10minutes = (now) => {
  sails.log.debug("Refreshing full-text search index");
  return [
    FullTextSearch.refreshView(),
    Comment.sendDigests().then((count) =>
      sails.log.debug(`Sent ${count} message digests`)
    ),
  ];
};

const runJob = Promise.method((name) => {
  const job = { hourly, daily, every10minutes }[name];
  if (typeof job !== "function") {
    throw new Error(`Unknown job name: "${name}"`);
  }
  sails.log.debug(`Running ${name} job`);
  const now = moment.tz("America/Los_Angeles");
  return Promise.all(job(now));
});

skiff.lift({
  start: function (argv) {
    runJob(argv.interval)
      .then(function () {
        skiff.lower();
      })
      .catch(function (err) {
        sails.log.error(red(err.message));
        sails.log.error(err);
        rollbar.error(err, () => skiff.lower());
      });
  },
});
