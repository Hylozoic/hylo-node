const { DateTime } = require('luxon')

module.exports = {

  requireTimeRange: function (req, res) {
    let valid = true

    _.each(['start_time', 'end_time'], function (attr) {
      const value = req.param(attr)

      if (!value) {
        res.badRequest(attr + ' is missing')
        valid = false
        return false // break from each
      }
      const time = value instanceof Date ? DateTime.fromJSDate(value) : typeof value === 'number' ? DateTime.fromMillis(value) : DateTime.fromISO(value)

      if (!time.isValid) {
        res.badRequest(attr + ' is not a valid ISO8601 date string')
        valid = false
        return false // break from each
      }
    })

    return valid
  }

}
