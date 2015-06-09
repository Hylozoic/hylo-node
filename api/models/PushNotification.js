var format = require('util').format,
  Promise = require('bluebird'),
  ZeroPush = require("nzero-push");

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',

  send: function() {

    var zeroPush = new ZeroPush(process.env.ZEROPUSH_SERVER_TOKEN),
      notify = Promise.promisify(zeroPush.notify, zeroPush),
      platform = "ios_macos",
      deviceTokens = [this.get("device_token")],
      notification = {
        alert: this.get("alert"),
        info: JSON.parse(this.get("payload")),
        badge: this.get("badge_no")
      };

    this.set("time_sent", (new Date()).toISOString());
    return this.save()
    .then(pn => notify(platform, deviceTokens, notification));
  }

});
