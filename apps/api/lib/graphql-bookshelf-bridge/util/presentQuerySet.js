import { PAGINATION_TOTAL_COLUMN_NAME } from './applyPagination'

export default function presentQuerySet (models, options) {
  // for backwards compatibility
  const limit = options.first || options.limit
  const offset = options.offset || 0

  if (!limit) {
    throw new Error('presentQuerySet needs a "limit" or "first" option')
  }

  var total = 0

  if (options.total) {
    total = Number(options.total)
  } else if (models.length > 0) {
    total = Number(models[0].get(PAGINATION_TOTAL_COLUMN_NAME))
  }

  return {
    total,
    items: models,
    hasMore: offset + limit < total
  }
}
