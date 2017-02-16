import { countTotal } from '../../../lib/util/knex'

export const PAGINATION_TOTAL_COLUMN_NAME = '__total'

export default function applyPagination (query, tableName, { first, cursor, order, column = 'id' }) {
  query = query.orderBy(column, order)
  if (first) {
    query = query.limit(first)
    query = countTotal(query, tableName, PAGINATION_TOTAL_COLUMN_NAME)
  }
  if (cursor) {
    const op = order === 'asc' ? '>' : '<'
    query = query.where(`${tableName}.${column}`, op, cursor)
  }
  return query
}
