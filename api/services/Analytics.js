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
  let properties = {platform: 'Web'}
  if (req.headers['ios-version']) {
    properties.platform = 'ios'
  } else if (req.headers['android-version']) {
    properties.platform = 'android'
  }
  this.track({
    userId,
    event: 'Signup success',
    properties})
}

module.exports = instance
