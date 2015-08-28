/**
 * DeviceController
 *
 * @description :: Server-side logic for managing devices
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  create: function (req, res) {
    var token = req.param('token');
    var platform = req.param('platform');

    if (!token) {
      return res.serverError('no device token');
    }

    if (!platform) {
      platform = "ios_macos"
    }

    return Device.forge({
      token: req.param("token"),
      platform: platform,
      user_id: req.session.userId
    })
    .fetch()
    .then(device => {
      if (device) {
        return device
        .save({enabled: true})
        .then(device => res.ok({result: "Known"}))
      } else {
        return Device.forge({
          token: req.param("token"),
          platform: platform,
          user_id: req.session.userId
        })
        .save()
        .then(device => res.ok({result: "Added"}));
      };
    })
    .catch(res.serverError);
  },

  destroy: function (req, res) {
    var token = req.param('token');
    if (!token) {
      return res.serverError('no device token');
    }

    return Device.query()
    .where({
      token: token,
      user_id: req.session.userId
    })
    .update({enabled: false})
    .then(() => res.ok({result: "Updated"}))
    .catch(res.serverError);
  },

  updateBadgeNo: function (req, res) {
    var token = req.param('token');
    if (!token) {
      return res.serverError('no device token');
    }

    return Device.query()
    .where({
      token: token,
      user_id: req.session.userId
    })
    .update({badge_no: req.param("badgeNo") || 0})
    .then(() => res.ok({result: "Updated"}))
    .catch(res.serverError);
  }

};
