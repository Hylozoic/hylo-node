// shared code for the Skill and Organization models

var simpleListFn = columnName => collection =>
  _.map(collection.models, model => model.attributes[columnName])

var updateFn = function (modelName, tableName, columnName) {
  return function (entries, userId) {
    // this must be looked up at runtime
    var model = global[modelName]
    entries = _.uniq(entries)

    return model.where({user_id: userId}).fetchAll().then(function (collection) {
      var existing = model.simpleList(collection)
      var toAdd = _.difference(entries, existing)
      var toRemove = _.difference(existing, entries)
      var queries = []
      var q

      if (toRemove.length > 0) {
        q = bookshelf.knex(tableName).where('user_id', userId).whereIn(columnName, toRemove).del()
        queries.push(q)
      }

      if (toAdd.length > 0) {
        var values = _.map(toAdd, function (name) {
          var ret = {user_id: userId}
          ret[columnName] = name
          return ret
        })
        q = bookshelf.knex(tableName).insert(values)
        queries.push(q)
      }

      return Promise.all(queries)
    })
  }
}

module.exports = {
  simpleListFn: simpleListFn,
  updateFn: updateFn
}
