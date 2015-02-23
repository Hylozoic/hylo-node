module.exports = {
  count: function(relation, options) {
    return relation.query(function(qb) {
      qb.count("*");
    }).fetchOne(_.pick(options, "transacting")).then(function(row) {
      return row.get("count");
    });
  }
};
