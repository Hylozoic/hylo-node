import { pick } from 'lodash'

module.exports = {
  count: function (relation, options) {
    const query = relation.query(qb => qb.count())
    const fn = (query.fetchOne || query.fetch).bind(query)
    return fn(pick(options, 'transacting'))
    .then(row => Number(row.get('count')))
  }
}
