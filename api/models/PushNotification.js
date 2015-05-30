var format = require('util').format,
    ZeroPush = require("nzero-push");

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',

  send: function() {

    console.log("pushNotification.send()");
    
    var zeroPush = new ZeroPush(process.env.ZEROPUSH_SERVER_TOKEN);
    var platform = "ios_macos";
    var deviceTokens = [ this.get("device_token")];
    var notification = {
      alert: this.get("alert"),
      info: JSON.parse(this.get("payload")),
      badge: "+1"
    };

    this.set("time_sent", (new Date()).toISOString());
    this.save()
      .then(pn => {
        zeroPush.notify(platform, deviceTokens, notification, function (err, response) {
          if (err)
            return console.error(err);

          return console.log(response);
        });
      });        
  }
    
});
