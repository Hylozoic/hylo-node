var sails = require('sails'),
  instance;

if (process.env.NODE_ENV == 'test') {
  instance = {
    track: function(opts) {
      sails.log.verbose('Analytics.track: ' + JSON.stringify(opts));
    }
  };
} else {
  instance = require('analytics-node')(process.env.SEGMENT_KEY);
}

module.exports = instance;