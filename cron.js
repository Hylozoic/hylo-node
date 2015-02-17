
var skiff = require('./lib/skiff'), // this must be required first
  rollbar = skiff.rollbar,
  sails = skiff.sails,
  moment = require('moment'),
  Changes = require('./lib/community/changes'),
  Digest = require('./lib/community/digest');

require('moment-timezone');

var sendDailyDigests = function() {
  sails.log.info('Sending daily digests');

  var today = moment.tz('America/Los_Angeles').clone().startOf('day'),
    yesterday = today.clone().subtract(1, 'day');

  Changes.changedCommunities(yesterday, today)
  .then(function(communityIds) {
    return Community.query(function(qb) {
      qb.whereIn('id', communityIds);
    }).fetchAll();
  })
  .then(function(communities) {
    return Promise.map(communities, function(community) {
      var dg = new Digest(community, yesterday, today);
      dg.fetchData().then(dg.queueEmails.bind(dg));
    });
  });

};

var intervals = {

  daily: function() {
    sails.log.info('noop!');
  },

  hourly: function() {
    var now = moment.tz('America/Los_Angeles');

    switch (now.hour()) {
      case 12:
        sendDailyDigests();
        break;
    }
  },

  every10minutes: function() {
    sails.log.info('noop!');
  }

}

skiff.lift({
  start: function(argv) {
    sails.log.info('running ' + argv.interval + ' job');
    intervals[argv.interval]();
    skiff.lower();
  }
});
