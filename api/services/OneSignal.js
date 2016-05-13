var Promise = require('bluebird')
var request = require('request')

var OneSignal = module.exports = {

  register: function (platform, deviceToken) {
    var url = 'https://onesignal.com/api/v1/players'
    var appId = process.env.ONESIGNAL_APP_ID
    var deviceType = platform === 'ios_macos' ? 0 : 1
    var params = {app_id: appId, device_type: deviceType, identifier: deviceToken}

    if (process.env.NODE_ENV === 'development') {
      params['test_type'] = 1
    }

    var requestOptions = {
      url: url,
      method: 'POST',
      json: params
    }

    return new Promise((resolve, reject) => {
      request(requestOptions, (error, resp, body) => {
        if (error) return reject(error)

        if (resp.statusCode !== 200) {
          return reject('OneSignal.register for device ' + deviceToken + ' failed with status code: ' + resp.statusCode)
        }

        resolve(resp)
      })
    })
  },

  iosBadgeUpdate: function (deviceToken, badgeNo) {
    return {
      include_ios_tokens: [deviceToken],
      ios_badgeType: 'SetTo',
      ios_badgeCount: badgeNo,
      content_available: true
    }
  },

  iosNotification: function (deviceToken, alert, path, badgeNo) {
    return _.merge(_.omit(OneSignal.iosBadgeUpdate(deviceToken, badgeNo), 'content_available'),
      {
        contents: {en: alert},
        data: {path: path}
      })
  },

  androidNotification: function (deviceToken, alert, path) {
    return {
      include_android_reg_ids: [deviceToken],
      contents: {en: alert},
      data: {alert: alert, path: path}
    }
  },

  notification: function (platform, deviceToken, alert, path, badgeNo) {
    var params

    if (platform === 'ios_macos') {
      if (path === '') {
        params = OneSignal.iosBadgeUpdate(deviceToken, badgeNo)
      } else {
        params = OneSignal.iosNotification(deviceToken, alert, path, badgeNo)
      }
    } else {
      params = OneSignal.androidNotification(deviceToken, alert, path)
    }

    params['app_id'] = process.env.ONESIGNAL_APP_ID
    return params
  },

  notify: function (platform, deviceToken, alert, path, badgeNo) {
    var url = 'https://onesignal.com/api/v1/notifications'
    var params = OneSignal.notification(platform, deviceToken, alert, path, badgeNo)

    var requestOptions = {
      url: url,
      method: 'POST',
      json: params
    }

    return new Promise((resolve, reject) => {
      request(requestOptions, (error, resp, body) => {
        if (error) return reject(error)

        if (resp.statusCode !== 200) {
          return reject('OneSignal.notify for device ' + deviceToken + ' failed with status code: ' + resp.statusCode)
        }

        resolve(resp)
      })
    })
  }
}
