module.exports = {
  validate: function (params, model, allowedColumns, allowedConstraints) {
    // prevent SQL injection
    if (!_.includes(allowedColumns, params.column)) {
      return Promise.resolve({badRequest: format('invalid value "%s" for parameter "column"', params.column)})
    }

    if (!params.value) {
      return Promise.resolve({badRequest: 'missing required parameter "value"'})
    }

    if (!_.includes(allowedConstraints, params.constraint)) {
      return Promise.resolve({badRequest: format('invalid value "%s" for parameter "constraint"', params.constraint)})
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
      return data
    })
  }
}
