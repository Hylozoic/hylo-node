module.exports = {
  count: function (relation, options) {
    return relation.query(qb => qb.count())
    .fetchOne(_.pick(options, 'transacting'))
    .then(row => Number(row.get('count')))
  }
}
