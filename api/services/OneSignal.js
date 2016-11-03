import request from 'request'
import Promise from 'bluebird'
import { merge, omit } from 'lodash'

const host = 'https://onesignal.com'

function iosBadgeUpdateParams (deviceToken, badgeNo) {
  return {
    include_ios_tokens: [deviceToken],
    ios_badgeType: 'SetTo',
    ios_badgeCount: badgeNo,
    content_available: true
  }
}

function iosNotificationParams (deviceToken, alert, path, badgeNo) {
  return merge(omit(iosBadgeUpdateParams(deviceToken, badgeNo), 'content_available'),
    {
      contents: {en: alert},
      data: {path: path}
    })
}

function androidNotificationParams (deviceToken, alert, path) {
  return {
    include_android_reg_ids: [deviceToken],
    contents: {en: alert},
    data: {alert: alert, path: path}
  }
}

function notificationParams (platform, deviceToken, alert, path, badgeNo, appId) {
  var params

  if (platform === 'ios_macos') {
    if (path === '') {
      params = iosBadgeUpdateParams(deviceToken, badgeNo)
    } else {
      params = iosNotificationParams(deviceToken, alert, path, badgeNo)
    }
  } else {
    params = androidNotificationParams(deviceToken, alert, path)
  }

  params['app_id'] = appId || process.env.ONESIGNAL_APP_ID
  return params
}

const postToAPI = (name, deviceToken, options) =>
  new Promise((resolve, reject) =>
    request(Object.assign({method: 'POST'}, options), (error, resp, body) =>
      error ? reject(error)
        : resp.statusCode !== 200
          ? reject(`OneSignal.${name} for device ${deviceToken} failed with status code ${resp.statusCode}`)
          : resolve(resp)))

module.exports = {
  host,

  register: (platform, deviceToken) =>
    postToAPI('register', deviceToken, {
      url: `${host}/api/v1/players`,
      json: {
        app_id: process.env.ONESIGNAL_APP_ID,
        device_type: platform === 'ios_macos' ? 0 : 1,
        identifier: deviceToken,
        test_type: process.env.NODE_ENV === 'development' ? 1 : null
      }
    }),

  notify: (platform, deviceToken, alert, path, badgeNo, appId) =>
    postToAPI('notify', deviceToken, {
      url: `${host}/api/v1/notifications`,
      json: notificationParams(platform, deviceToken, alert, path, badgeNo, appId)
    })
}
