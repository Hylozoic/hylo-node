var moment = require('moment-timezone');

module.exports = {

  requireTimeRange: function(req, res) {
    var valid = true;

    _.each(['start_time', 'end_time'], function (attr) {
      var value = req.param(attr);

      if (!value) {
        res.badRequest(attr + ' is missing');
        valid = false;
        return false; // break from each
      }

      if (!moment(value).isValid()) {
        res.badRequest(attr + ' is not a valid ISO8601 date string');
        valid = false;
        return false; // break from each
      }
    });

    return valid;
  }

}
