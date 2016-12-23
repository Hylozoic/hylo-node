export default function applyPagination (query, { first, cursor, order, column = 'id' }) {
  query = query.orderBy(column, order)
  if (first) query = query.limit(first)
  if (cursor) {
    const op = order === 'asc' ? '>' : '<'
    query = query.where(column, op, cursor)
  }
  return query
}
