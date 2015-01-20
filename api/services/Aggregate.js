module.exports = {
  count: function(relation, options) {
    return relation.query(function(qb) {
      qb.count("*");
    }).fetch(_.pick(options, "transacting")).then(function(collection) {
      return collection.first().get("count");
    });
  }
};
