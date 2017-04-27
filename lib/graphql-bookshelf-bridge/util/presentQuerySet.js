import { PAGINATION_TOTAL_COLUMN_NAME } from './applyPagination'

export default function presentQuerySet (models, options) {
  // for backwards compatibility
  const limit = options.first || options.limit
  const offset = options.offset || 0

  if (!limit) {
    throw new Error('presentQuerySet needs a "limit" or "first" option')
  }

  const total = models.length > 0
    ? Number(models[0].get(PAGINATION_TOTAL_COLUMN_NAME))
    : 0

  return {
    total,
    items: models,
    hasMore: offset + limit < total
  }
}
