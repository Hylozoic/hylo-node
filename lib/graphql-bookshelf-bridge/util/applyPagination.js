import { countTotal } from '../../../lib/util/knex'

export const PAGINATION_TOTAL_COLUMN_NAME = '__total'

export default function applyPagination (query, tableName, opts) {
  const { first, cursor, order, offset, sortBy = 'id' } = opts

  if (cursor && offset) {
    throw new Error('Specifying both cursor and offset is not supported.')
  }

  if (cursor && sortBy !== 'id') {
    throw new Error('Specifying both cursor and sortBy is not supported.')
  }

  query = query.orderBy(sortBy, order)

  if (first) {
    query = query.limit(first)
  }

  query = countTotal(query, tableName, PAGINATION_TOTAL_COLUMN_NAME)
  
  if (cursor) {
    const op = order === 'asc' ? '>' : '<'
    query = query.where(`${tableName}.${sortBy}`, op, cursor)
  } else if (offset) {
    query.offset(offset)
  }

  return query
}
