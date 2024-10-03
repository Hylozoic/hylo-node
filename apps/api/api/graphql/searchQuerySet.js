import { capitalize } from 'lodash'
import { isNull, isUndefined, omitBy } from 'lodash/fp'
import { PAGINATION_TOTAL_COLUMN_NAME } from '../../lib/graphql-bookshelf-bridge/util/applyPagination'

export default function searchQuerySet (searchName, options) {
  if (!searchName.startsWith('for')) {
    searchName = 'for' + capitalize(searchName)
  }
  return Search[searchName](sanitizeOptions(searchName, options))
}

export function sanitizeOptions (name, options) {
  if (options.first) {
    options.limit = options.first
    delete options.first
  }

  return Object.assign(
    {},
    defaultOptions,
    omitBy(x => isNull(x) || isUndefined(x), options)
  )
}

const defaultOptions = {
  totalColumnName: PAGINATION_TOTAL_COLUMN_NAME,
  offset: 0,
  limit: 100
}
