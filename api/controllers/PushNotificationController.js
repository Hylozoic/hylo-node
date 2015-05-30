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
    
    if(req.session.userId && req.param("deviceToken")) {

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
	        res.ok({result: "Added"})
              })
              .otherwise(function (err) {
	        res.ok({result: "Failed to save"})		
	      })
          }          
	})
    } else {
      // this is debugging and should be removed
      res.json({toplevel: {user_name: user.get("name"), user_id: req.session.userId, query_dt: req.param("deviceToken")}})
    }
  },
  
  updateBadgeNo: function (req, res) {
    
    if(req.session.userId && req.param("deviceToken")) {
      
      Device.forge({
	token: req.param("deviceToken"),
	user_id: req.session.userId
      })
        .fetch()
	.then(function (device) {
          device.save({
            badge_no: req.param("badgeNo") || 0
          })
        })
        .then(() => res.ok({result: "Updated"}))
	.otherwise(function (err) {
	  res.ok({result: "Failed to Update"})		
	});
    }   
  }        
  
};

