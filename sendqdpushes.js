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

    Qdpush.query(function(qb) {
      qb.whereNull("time_sent")
    })
      .fetchAll()
      .then(function (qdpushes) {
        return qdpushes.map(function (qdpush) {
          
          var myDevice = new apn.Device(qdpush.get("device_token"));
          
          var note = new apn.Notification()
          
          note.expiry = Math.floor(Date.now() / 1000) + 3600;
          note.badge = qdpush.get("badge_no");
          note.alert = qdpush.get("alert");
          note.payload = JSON.parse(qdpush.get("payload"));
          
          apnConnection.pushNotification(note, myDevice);
          
          console.log(qdpush.get("payload"));

          qdpush.set("time_sent", (new Date()).toISOString());

          qdpush.save();
          
          return qdpush;
        })
      })
  }
});
  
/*

knex('queued_pushes')
  .whereNull("time_sent")
  .map(function(qdpush) {

  });

knex('queued_pushes')
  .whereNull("time_sent")
  .update({
    time_sent: 
  })
  .catch(function(error) {
    console.log(error)
  })



*/
