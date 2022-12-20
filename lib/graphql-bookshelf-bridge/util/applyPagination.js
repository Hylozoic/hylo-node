const { GraphQLYogaError } = require('@graphql-yoga/node')
import { countTotal } from '../../../lib/util/knex'
import { snakeCase } from 'lodash'

export const PAGINATION_TOTAL_COLUMN_NAME = '__total'

export default function applyPagination (query, tableName, opts) {
  const { first, cursor, order, offset, sortBy = 'id' } = opts

  if (cursor && sortBy !== 'id') {
    throw new GraphQLYogaError('Specifying both cursor and sortBy is not supported.')
  }

  // skip special sorts
  if (!['join', 'reactions', 'votes', 'updated', 'created'].includes(sortBy)) { // Can remove votes once Mobile has been ported over
    query = query.orderBy(snakeCase(sortBy), order)
  }

  if (first) {
    query = query.limit(first)
  }

  query = countTotal(query, tableName, PAGINATION_TOTAL_COLUMN_NAME)

  if (cursor) {
    const op = order === 'asc' ? '>' : '<'
    query = query.where(`${tableName}.${sortBy}`, op, cursor)
  }

  if (offset) {
    query.offset(offset)
  }

  return query
}
