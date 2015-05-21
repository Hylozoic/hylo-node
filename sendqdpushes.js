var apn = require('apn');
//require("./config/bootstrap.js");


var knex = require('knex')({
  client: 'pg',
  connection: {
    host     : '127.0.0.1',
    user     : '',
    password : '',
    database : 'hylo',
    charset  : 'utf8'
  }
});

var options = {passphrase: "kniujhYY&u",
               key: "/Users/robbiecarlton/programming/node/apntest/key.pem",
               cert: "/Users/robbiecarlton/programming/node/apntest/cert.pem"
              };
    
var apnConnection = new apn.Connection(options)

knex('queued_pushes')
  .whereNull("time_sent")
  .map(function(qdpush) {

    var myDevice = new apn.Device(qdpush.device_token);

    var note = new apn.Notification()

    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = qdpush.badge_no;
    note.alert = qdpush.alert;
    note.payload = JSON.parse(qdpush.payload);

    apnConnection.pushNotification(note, myDevice);

    console.log(qdpush.payload)

    return qdpush;
  });

knex('queued_pushes')
  .whereNull("time_sent")
  .update({
    time_sent: (new Date()).toISOString()
  })
  .catch(function(error) {
    console.log(error)
  })



