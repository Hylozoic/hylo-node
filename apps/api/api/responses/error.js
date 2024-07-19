import rollbar from '../../lib/rollbar'

module.exports = ({ statusCode, statusText, logData }) => function (data, options) {
  // Get access to `req`, `res`, & `sails`
  var req = this.req
  var res = this.res
  var sails = req._sails

  // Set status code
  res.status(statusCode)

  // Log error to console
  if (data !== undefined) {
    sails.log.verbose(`Sending ${statusCode} ("${statusText}") response: \n`, data)
  } else {
    sails.log.verbose(`Sending ${statusCode} ("${statusText}") response`)
  }

  // Only include errors in response if application environment
  // is not set to 'production'.  In production, we shouldn't
  // send back any identifying information about errors.
  if (sails.config.environment === 'production') {
    if (statusCode === 500) rollbar.error(data, req)
    data = undefined
  } else if (logData) {
    sails.log.error(data.stack.split('\n').slice(0, 8).join('\n'))
  }

  // If the user-agent wants JSON, always respond with JSON
  if (req.wantsJSON) {
    return res.json(data)
  }

  // If second argument is a string, we take that to mean it refers to a view.
  // If it was omitted, use an empty object (`{}`)
  options = (typeof options === 'string') ? { view: options } : options || {}

  // If a view was provided in options, serve it.
  // Otherwise try to guess an appropriate view, or if that doesn't
  // work, just send JSON.
  if (options.view) {
    return res.view(options.view, {data})
  } else {
    // If no second argument provided, try to serve the default view,
    // but fall back to sending JSON(P) if any errors occur.
    return res.view(statusCode.toString(), {data}, function (err, html) {
      // If a view error occured, fall back to JSON(P).
      if (err) {
        //
        // Additionally:
        // • If the view was missing, ignore the error but provide a verbose log.
        if (err.code === 'E_VIEW_FAILED') {
          sails.log.verbose(`res.error(${statusCode}) :: Could not locate view for error page (sending JSON instead).  Details: `, err)
        } else {
          // Otherwise, if this was a more serious error, log to the console with the details.
          sails.log.warn(`res.error(${statusCode}) :: When attempting to render error page view, an error occured (sending JSON instead).  Details: `, err)
        }
        return res.json(data)
      }

      return res.send(html)
    })
  }
}
