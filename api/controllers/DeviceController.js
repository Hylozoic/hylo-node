/**
 * DeviceController
 *
 * @description :: Server-side logic for managing devices
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  create: function (req, res) {
    var token = req.param('token')
    var platform = req.param('platform')

    if (!token) {
      return res.serverError('no device token')
    }

    if (!platform) {
      platform = 'ios_macos'
    }

    var version

    if (platform === 'ios_macos') {
      version = req.headers['ios-version']
    } else {
      version = req.headers['android-version']
    }

    return Device.forge({
      token: req.param('token'),
      platform: platform
    })
    .fetch()
    .then(device => {
      if (device) {
        return device
        .save({version, enabled: true, user_id: req.getUserId()})
        .then(device => res.ok({result: 'Updated'}))
      } else {
        return Device.forge({
          token: req.param('token'),
          platform: platform,
          version: version,
          user_id: req.getUserId()
        })
        .save()
        .tap(device => version && OneSignal.register(platform, req.param('token')))
        .then(device => res.ok({result: 'Added'}))
      }
    })
    .catch(res.serverError)
  },

  destroy: function (req, res) {
    var token = req.param('token')
    if (!token) {
      return res.serverError('no device token')
    }

    return Device.query()
    .where({
      token: token,
      user_id: req.getUserId()
    })
    .update({enabled: false})
    .then(() => res.ok({result: 'Updated'}))
    .catch(res.serverError)
  },

  updateBadgeNo: function (req, res) {
    var token = req.param('token')
    if (!token) {
      return res.serverError('no device token')
    }

    return Device.query()
    .where({
      token: token,
      user_id: req.getUserId()
    })
    .update({badge_no: req.param('badgeNo') || 0})
    .then(() => res.ok({result: 'Updated'}))
    .catch(res.serverError)
  }

}
