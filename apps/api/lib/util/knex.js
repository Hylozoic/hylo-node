import { difference, isEmpty, isEqual } from 'lodash'
import { find, flow, get, map, pick, some, values } from 'lodash/fp'

// update rows in `table` with `column`=`fromValue` to column=toValue. if a row
// would cause a duplicate key error, delete it instead.
//
// `uniqueCols` is an array of column names used to determine whether a
// duplicate key error should be avoided. `uniqueCols.concat(column)` should
// correspond to a uniqueueness constraint on the table.
//
// `knex` can be a transaction object.
//
export const updateOrRemove = (table, column, fromValue, toValue, uniqueCols, knex) => {
  const uniqueValues = x => values(pick(uniqueCols, x))
  const sameUniqueValues = x => y => isEqual(uniqueValues(x), uniqueValues(y))
  let rowsToChange

  // find all the rows to be changed
  return knex(table).where(column, fromValue)
  .then(rows => { rowsToChange = rows })
  // find duplicate rows
  .then(() => knex(table).where(column, toValue)
    .whereIn(uniqueCols, map(uniqueValues, rowsToChange)))
  .then(duplicates => {
    const idsToRemove = flow(
      map(dup => find(sameUniqueValues(dup), rowsToChange)),
      map(get('id'))
    )(duplicates)
    const idsToUpdate = difference(map('id', rowsToChange), idsToRemove)

    return Promise.join(
      isEmpty(idsToRemove) || knex(table).whereIn('id', idsToRemove).del(),
      isEmpty(idsToUpdate) || knex(table).whereIn('id', idsToUpdate).update(column, toValue)
    )
  })
}

export const countTotal = (q, table, columnName = 'total') => {
  return q.select(bookshelf.knex.raw(`${table}.*, count(*) over () as ${columnName}`))
}

export function hasJoin (relation, tableName) {
  return some(clause => clause.table === tableName, relation.query()._statements) ||
    get('throughTableName', relation.relatedData) === tableName
}
