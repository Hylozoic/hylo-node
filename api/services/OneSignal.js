import request from 'request'
import Promise from 'bluebird'
import { isNull, merge, omit } from 'lodash'
import { omitBy } from 'lodash/fp'

const HOST = 'https://onesignal.com'

function iosBadgeUpdateParams ({ deviceToken, playerId, badgeNo }) {
  if (deviceToken && playerId) {
    throw new Error("Can't pass both a device token and a player ID")
  }

  return omitBy(isNull, {
    include_ios_tokens: deviceToken ? [deviceToken] : null,
    include_player_ids: playerId ? [playerId] : null,
    ios_badgeType: 'SetTo',
    ios_badgeCount: badgeNo,
    content_available: true
  })
}

function iosNotificationParams ({ deviceToken, playerId, alert, path, badgeNo }) {
  const coreParams = iosBadgeUpdateParams({deviceToken, playerId, badgeNo})
  return merge(
    omit(coreParams, 'content_available'),
    {
      contents: {en: alert},
      data: {path: path}
    }
  )
}

function androidNotificationParams ({ deviceToken, playerId, alert, path }) {
  if (deviceToken && playerId) {
    throw new Error("Can't pass both a device token and a player ID")
  }

  return omitBy(isNull, {
    include_android_reg_ids: deviceToken ? [deviceToken] : null,
    include_player_ids: playerId ? [playerId] : null,
    contents: {en: alert},
    data: {alert: alert, path: path}
  })
}

function notificationParams ({ platform, deviceToken, playerId, alert, path, badgeNo, appId }) {
  var params

  if (platform.startsWith('ios')) {
    if (path === '') {
      params = iosBadgeUpdateParams({deviceToken, playerId, badgeNo})
    } else {
      params = iosNotificationParams({deviceToken, playerId, alert, path, badgeNo})
    }
  } else {
    params = androidNotificationParams({deviceToken, alert, path})
  }

  params['app_id'] = appId || process.env.ONESIGNAL_APP_ID
  return params
}

const postToAPI = (name, deviceToken, options) =>
  new Promise((resolve, reject) =>
    request(Object.assign({method: 'POST'}, options), (error, resp, body) =>
      error ? reject(error)
        : resp.statusCode !== 200
          ? reject(new Error(`OneSignal.${name} for device ${deviceToken} failed with status code ${resp.statusCode}`))
          : resolve(resp)))

module.exports = {
  // DEPRECATED
  register: (platform, deviceToken) =>
    postToAPI('register', deviceToken, {
      url: `${HOST}/api/v1/players`,
      json: {
        app_id: process.env.ONESIGNAL_APP_ID,
        device_type: platform === 'ios_macos' ? 0 : 1,
        identifier: deviceToken,
        test_type: process.env.NODE_ENV === 'development' ? 1 : null
      }
    }),

  notify: ({ platform, deviceToken, playerId, alert, path, badgeNo, appId }) =>
    postToAPI('notify', deviceToken, {
      url: `${HOST}/api/v1/notifications`,
      json: notificationParams({platform, deviceToken, playerId, alert, path, badgeNo, appId})
    })
}
