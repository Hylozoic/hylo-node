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

    Device.forge({
      token: req.param("deviceToken"),
      user_id: req.session.userId
    })
    .fetch()
    .then(function (device) {
      if(!device) {
        Device.forge({
          token: req.param("deviceToken"),
          user_id: req.session.userId
        })
        .save()
        .then(function(device) {
          res.ok({result: "Added"});
        })
        .catch(function (e) {
          res.serverError(e);
	});
      } else {
        res.ok({result: "Known"});          
      };          
    });
  },
  
  updateBadgeNo: function (req, res) {
    var token = req.param('deviceToken');
    if (!token) {
      return res.serverError('no device token');
    }
    
    Device.forge({
      token: token,
      user_id: req.session.userId
    })
    .fetch()
    .then(function (device) {
      device.save({
        badge_no: req.param("badgeNo") || 0
      });
    })
    .then(() => res.ok({result: "Updated"}))
    .catch(function (e) {
      res.serverError(e);          
    });
  }     
  
};

