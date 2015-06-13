var format = require('util').format,
  Promise = require('bluebird'),
  ZeroPush = require('nzero-push'),
  rollbar = require('rollbar');

module.exports = bookshelf.Model.extend({
  tableName: 'push_notifications',

  send: function(options) {

    var zeroPush = new ZeroPush(process.env.ZEROPUSH_PROD_TOKEN),
      notify = Promise.promisify(zeroPush.notify, zeroPush),
      platform = "ios_macos",
      deviceTokens = [this.get("device_token")],
      notification = {
        alert: this.get("alert"),
        info: JSON.parse(this.get("payload")),
        badge: this.get("badge_no")
      };

    this.set("time_sent", (new Date()).toISOString());
    return this.save({}, options)
      .then(pn => notify(platform, deviceTokens, notification))
      .catch(e => rollbar.handleErrorWithPayloadData(e, {custom: {server_token: process.env.ZEROPUSH_PROD_TOKEN, device_token: deviceTokens}}));
  }

});
