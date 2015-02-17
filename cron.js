
var skiff = require('./lib/skiff'), // this must be required first
  rollbar = skiff.rollbar,
  sails = skiff.sails,
  moment = require('moment-timezone'),
  Changes = require('./lib/community/changes'),
  Digest = require('./lib/community/digest');

require('colors');

var sendDailyDigests = function() {
  sails.log.info('Sending daily digests');

  var today = moment.tz('America/Los_Angeles').clone().startOf('day'),
    yesterday = today.clone().subtract(1, 'day');

  Changes.changedCommunities(yesterday, today)
  .then(function(communityIds) {
    return Community.query(function(qb) {
      qb.whereIn('id', communityIds);
      qb.where('daily_digest', true);
    }).fetchAll();
  })
  .then(function(communities) {
    return Promise.map(communities.models, function(community) {
      var dg = new Digest(community, yesterday, today);
      return dg.fetchData().then(dg.queueEmails.bind(dg));
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
    try {
      sails.log.info('running ' + argv.interval + ' job');
      intervals[argv.interval]();
    } catch(err) {
      sails.log.error(label + err.message.red);
      rollbar.handleError(err);
    }

    skiff.lower();
  }
});
