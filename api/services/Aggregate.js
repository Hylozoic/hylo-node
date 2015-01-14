module.exports = {
  count: function(relation) {
    return relation.query(function(qb) {
      qb.count("*");
    }).fetch().then(function(collection) {
      return collection.first().get("count");
    });
  }
};
