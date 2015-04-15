var sails = require('sails'),
  uuid = require('node-uuid'),
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

instance.pixelUrl = function(emailName, props) {
  var prefix = 'https://api.segment.io/v1/pixel/track?data=';

  var data = {
    writeKey: process.env.SEGMENT_KEY,
    event: 'Viewed Email: ' + emailName,
    properties: props
  };

  if (!data.userId) {
    data.anonymousId = uuid.v4();
  }

  var encodedData = new Buffer(JSON.stringify(data), 'utf8').toString('base64');
  return prefix + encodedData;
};

module.exports = instance;