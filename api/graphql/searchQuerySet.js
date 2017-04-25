import { mapValues } from 'lodash'
import { PAGINATION_TOTAL_COLUMN_NAME } from '../../lib/graphql-bookshelf-bridge/util/applyPagination'

export default function searchQuerySet (searchName, options) {
  return Search[searchName](sanitizeOptions(searchName, options))
}

export function fetchSearchQuerySet (searchName, options) {
  return searchQuerySet(searchName, options).fetchAll()
  .then(({ length, models }) => {
    const total = models.length > 0
      ? Number(models[0].get(PAGINATION_TOTAL_COLUMN_NAME))
      : 0
    return {
      total,
      items: models,
      hasMore: options.offset + options.limit < total
    }
  })
}

export function sanitizeOptions (name, options) {
  const shim = shims[name]
  if (!shim) throw new Error(`no option shim for ${name}`)

  const withDefaults = Object.assign({}, defaultOptions.all,
    defaultOptions[name], options)
  return shim(withDefaults)
}

const defaultOptions = {
  all: {
    totalColumnName: PAGINATION_TOTAL_COLUMN_NAME,
    offset: 0,
    limit: 100
  },
  forPosts: {
    sort: 'updated'
  }
}

// this is for shimming between the existing Search code, with its warts and its
// accommodations for legacy code, and the GraphQL schema, which we want to be a
// good domain language without weird implementation details poking through.
const shims = {
  forPosts: options => {
    const sortOptionShim = {
      votes: 'num_votes',
      updated: 'posts.updated_at'
    }

    if (!Object.keys(sortOptionShim).includes(options.sort)) {
      throw new Error(`invalid value for sort: ${options.sort}`)
    }

    return mapValues(options, (val, key) => {
      if (key === 'sort') return sortOptionShim[val]
      return val
    })
  },

  forUsers: options => {
    return options
  }
}
