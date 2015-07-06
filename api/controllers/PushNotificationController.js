/**
 * PushNotificationController
 *
 * @description :: Server-side logic for managing pushnotifications
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  /**
   * `PushNotificationController.addDevice()`
   */
  addDevice: function (req, res) {
    var token = req.param('deviceToken');
    if (!token) {
      return res.serverError('no device token');
    }

    return Device.forge({
      token: req.param("deviceToken"),
      user_id: req.session.userId
    })
    .fetch()
    .then(device => {
      if (device) {
        return device
        .save({enabled: true})
        .then(() => res.ok({result: "Known"}))
      } else {
        return Device.forge({
          token: req.param("deviceToken"),
          user_id: req.session.userId
        })
        .save()
        .then(device => res.ok({result: "Added"}));
      };
    })
    .catch(res.serverError);
  },

  disableDevice: function (req, res) {
    sails.log("disableDevice");
    var token = req.param('deviceToken');
    if (!token) {
      return res.serverError('no device token');
    }

    sails.log("token" + token);
    
    return Device.forge({
      token: token,
      user_id: req.session.userId
    })
    .fetch()
    .then(device => device.save({enabled: false}))
    .then(() => res.ok({result: "Updated"}))
    .catch(res.serverError);
  },
  
  updateBadgeNo: function (req, res) {
    var token = req.param('deviceToken');
    if (!token) {
      return res.serverError('no device token');
    }

    return Device.forge({
      token: token,
      user_id: req.session.userId
    })
    .fetch()
      .then(device => device.save({badge_no: req.param("badgeNo") || 0}))
    .then(() => res.ok({result: "Updated"}))
    .catch(res.serverError);
  }

};

