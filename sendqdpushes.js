var skiff = require('./lib/skiff'); // this must be first
var apn = require('apn'),
    sails = skiff.sails;

var apnOptions = {passphrase: "kniujhYY&u",
               key: "/Users/robbiecarlton/programming/node/apntest/key.pem",
               cert: "/Users/robbiecarlton/programming/node/apntest/cert.pem"
              };

var apnConnection = new apn.Connection(apnOptions)

skiff.lift({
  start: function(argv) {

    PushNotification.query(function(qb) {
      qb.whereNull("time_sent")
    })
      .fetchAll()
      .then(function (pushNotifications) {
        return pushNotifications.map(function (pushNotification) {
          
          var myDevice = new apn.Device(pushNotification.get("device_token"));
          
          var note = new apn.Notification();
          
          note.expiry = Math.floor(Date.now() / 1000) + 3600;
          note.badge = pushNotification.get("badge_no");
          note.alert = pushNotification.get("alert");
          note.payload = JSON.parse(pushNotification.get("payload"));
          
          apnConnection.pushNotification(note, myDevice);
          
          console.log(pushNotification.get("payload"));

          pushNotification.set("time_sent", (new Date()).toISOString());

          pushNotification.save();
          
          return pushNotification;
        });
      });

    
  }
});
