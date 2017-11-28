import request from 'request'
import Promise from 'bluebird'
import { isNull, merge, omit } from 'lodash'
import { omitBy } from 'lodash/fp'
import rollbar from '../../lib/rollbar'

const HOST = 'https://onesignal.com'

function iosBadgeUpdateParams ({ deviceToken, playerId, badgeNo }) {
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
      data: {path}
    }
  )
}

function androidNotificationParams ({ deviceToken, playerId, alert, path }) {
  return omitBy(isNull, {
    include_android_reg_ids: deviceToken ? [deviceToken] : null,
    include_player_ids: playerId ? [playerId] : null,
    contents: {en: alert},
    data: {alert, path}
  })
}

function notificationParams ({ platform, deviceToken, playerId, alert, path, badgeNo, appId }) {
  if (deviceToken && playerId) {
    throw new Error("Can't pass both a device token and a player ID")
  }

  let params

  if (platform.startsWith('ios')) {
    if (path === '') {
      params = iosBadgeUpdateParams({deviceToken, playerId, badgeNo})
    } else {
      params = iosNotificationParams({deviceToken, playerId, alert, path, badgeNo})
    }
  } else {
    params = androidNotificationParams({deviceToken, playerId, alert, path})
  }

  params['app_id'] = appId || process.env.ONESIGNAL_APP_ID
  return params
}

const postToAPI = (name, path, params) =>
  new Promise((resolve, reject) => {
    const opts = Object.assign({
      url: HOST + '/api/v1/' + path,
      method: 'POST',
      json: params
    })

    request(opts, (error, resp, body) => {
      if (error) return reject(error)

      if (resp.statusCode !== 200) {
        const error = new Error(`OneSignal.${name} failed`)
        error.response = resp
        return reject(error)
      }

      resolve(resp)
    })
  })

module.exports = {
  // DEPRECATED
  register: (platform, deviceToken) =>
    postToAPI('register', 'players', {
      app_id: process.env.ONESIGNAL_APP_ID,
      device_type: platform === 'ios_macos' ? 0 : 1,
      identifier: deviceToken,
      test_type: process.env.NODE_ENV === 'development' ? 1 : null
    }),

  notify: async (opts) => {
    const { platform, deviceToken, playerId } = opts
    const params = notificationParams(opts)

    try {
      return await postToAPI('notify', 'notifications', params)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(e)
      rollbar.error(err, null, {
        deviceToken,
        devicePlatform: platform, // 'platform' is a Rollbar reserved word
        playerId,
        response: err.response
      })
    }
  }
}
