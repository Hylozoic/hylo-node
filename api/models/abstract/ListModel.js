
// shared code for the Skill and Organization models

var simpleListFn = function(columnName) {
  return function(collection) {
    return _.map(collection.models, function(model) {
      return model.attributes[columnName];
    });
  }
};

var updateFn = function(modelName, tableName, columnName) {
  return function(skills, userId) {
    // this must be looked up at runtime
    var model = global[modelName];

    return model.where({user_id: userId}).fetchAll().then(function(collection) {
      var existing = model.simpleList(collection),
        toAdd = _.difference(skills, existing),
        toRemove = _.difference(existing, skills),
        queries = [], q;

      if (toRemove.length > 0) {
        q = bookshelf.knex(tableName).where('user_id', userId).whereIn(columnName, toRemove).del();
        queries.push(q);
      }

      if (toAdd.length > 0) {
        var values = _.map(toAdd, function(name) {
          var ret = {user_id: userId};
          ret[columnName] = name;
          return ret;
        })
        q = bookshelf.knex(tableName).insert(values);
        queries.push(q);
      }

      return Promise.all(queries);
    });
  }
};

module.exports = {
  simpleListFn: simpleListFn,
  updateFn: updateFn
};