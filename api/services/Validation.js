module.exports = {
  validate: function (req, res, model, allowedColumns, allowedConstraints) {
    var params = _.pick(req.allParams(), 'constraint', 'column', 'value')

    // prevent SQL injection
    if (!_.include(allowedColumns, params.column)) {
      return res.badRequest(format('invalid value "%s" for parameter "column"', params.column))
    }

    if (!params.value) {
      return res.badRequest('missing required parameter "value"')
    }

    if (!_.include(allowedConstraints, params.constraint)) {
      return res.badRequest(format('invalid value "%s" for parameter "constraint"', params.constraint))
    }

    var statement = format('lower(%s) = lower(?)', params.column)
    return model.query().whereRaw(statement, params.value).count()
    .then(function (rows) {
      var data
      if (params.constraint === 'unique') {
        data = {unique: Number(rows[0].count) === 0}
      } else if (params.constraint === 'exists') {
        var exists = Number(rows[0].count) >= 1
        data = {exists: exists}
      }
      res.ok(data)
    })
    .catch(res.serverError)
  }
}
