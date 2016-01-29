var format = require('util').format
var Promise = require('bluebird')
var request = require('request')
var rollbar = require('rollbar')
var HTTPStatus = require('http-status')

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',

  send: function (options) {
    if (process.env.NODE_ENV === 'test') return

    var zeroPushToken = this.zeroPushTokenFromPlatform()
    if (!zeroPushToken) {
      console.log('ZeroPush token not set. Not sending push notification.')
      return
    }

    var notify = Promise.promisify(this.notify)
    var deviceTokens = [this.get('device_token')]
    var notification = this.notificationForZP()

    this.set('time_sent', (new Date()).toISOString())
    return this.save({}, options)
      .then(pn => notify(zeroPushToken, deviceTokens, notification))
      .catch(e => rollbar.handleErrorWithPayloadData(e, {custom: {server_token: process.env.ZEROPUSH_PROD_TOKEN, device_token: deviceTokens}}))
  },

  notify: function (zeroPushToken, deviceTokens, notification, callback) {
    var BASE_URL = 'https://zeropush.pushwoosh.com'

    var requestOptions = {
      url: BASE_URL + '/notify',
      method: 'POST',
      headers: {'Accept': 'application/json', 'User-Agent': 'request', 'Content-Type': 'application/json'},
      json: true,
      body: notification
    }

    requestOptions.body.auth_token = zeroPushToken
    requestOptions.body.device_tokens = deviceTokens

    request(requestOptions, function (err, res, body) {
      if (err) return callback(err)

      switch (res.statusCode) {
        case HTTPStatus.OK:
          callback(null, body, res.headers)
          break
        case HTTPStatus.UNAUTHORIZED:
          callback(new Error('Resource access denied'))
          break
        case HTTPStatus.FORBIDDEN:
          callback(new Error('Access Forbidden: ' + body.message))
          break
        case HTTPStatus.NOT_FOUND:
          callback(new Error('Resource not found'))
          break
        case HTTPStatus.PRECONDITION_FAILED:
          callback(new Error('Precondition Failed: ' + body.message))
          break
        default:
          callback(new Error('Expected status code ' + HTTPStatus.OK + ' and received ' + res.statusCode))
      }
    })
  },

  notificationForZP: function () {
    var notification
    if (this.getPlatform() === 'ios_macos') {
      if (this.get('path') === '') {
        notification = {
          badge: this.get('badge_no')
        }
      } else {
        notification = {
          alert: this.get('alert'),
          info: {path: this.get('path')},
          badge: this.get('badge_no')
        }
      }
      return notification
    } else {
      var data = {alert: this.get('alert'), path: this.get('path')}
      notification = {
        data: data
      }
      return notification
    }
  },

  getPlatform: function () {
    var platform = this.get('platform')
    if (platform) {
      return platform
    } else {
      return 'ios_macos'
    }
  },

  zeroPushTokenFromPlatform: function () {
    if (this.getPlatform() === 'ios_macos') {
      return process.env.ZEROPUSH_PROD_TOKEN
    } else {
      return process.env.ZEROPUSH_PROD_TOKEN_ANDROID
    }
  }

}, {
  textForComment: function (comment, version, userId) {
    var post = comment.relations.post
    var commenter = comment.relations.user
    var postName, relatedUser

    if (version === 'mention') {
      return commenter.get('name') + ' mentioned you in a comment on'
    }

    if (post.isWelcome()) {
      relatedUser = post.relations.relatedUsers.first()
      if (relatedUser.id === userId) {
        postName = 'your welcome post'
      } else {
        postName = format("%s's welcome post", relatedUser.get('name'))
      }
    } else {
      postName = format('"%s"', post.get('name'))
    }
    return format('%s commented on %s', commenter.get('name'), postName)
  },

  textForNewPost: function (post, community, userId) {
    var relatedUser
    var creator = post.relations.creator

    if (post.isWelcome()) {
      relatedUser = post.relations.relatedUsers.first()
      if (relatedUser.id === userId) {
        return format('You joined %s!', community.get('name'))
      } else {
        return format('%s joined %s', relatedUser.get('name'), community.get('name'))
      }
    } else {
      return format('%s posted "%s" in %s', creator.get('name'), post.get('name'), community.get('name'))
    }
  }

})
