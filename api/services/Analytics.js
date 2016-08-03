const sails = require('sails')
const uuid = require('node-uuid')
var instance

if (process.env.NODE_ENV === 'test') {
  instance = {
    track: function (opts) {
      sails.log.verbose('Analytics.track: ' + JSON.stringify(opts))
    }
  }
} else {
  instance = require('analytics-node')(process.env.SEGMENT_KEY)
}

instance.pixelUrl = function (emailName, props) {
  var prefix = 'https://api.segment.io/v1/pixel/track?data='

  var data = {
    writeKey: process.env.SEGMENT_KEY,
    event: 'Viewed Email: ' + emailName,
    properties: props
  }

  if (props.userId) {
    data.userId = props.userId
  } else {
    data.anonymousId = uuid.v4()
  }

  var encodedData = new Buffer(JSON.stringify(data), 'utf8').toString('base64')
  return prefix + encodedData
}

instance.trackSignup = function (userId, req) {
  let event = 'Signup success'
  if (req.headers['ios-version']) {
    event += ' (iOS)'
  } else if (req.headers['android-version']) {
    event += ' (Android)'
  }
  this.track({userId, event})
}

module.exports = instance
