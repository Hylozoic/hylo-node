import { capitalize, mapValues } from 'lodash'
import { isNull, isUndefined, omitBy } from 'lodash/fp'
import { PAGINATION_TOTAL_COLUMN_NAME } from '../../lib/graphql-bookshelf-bridge/util/applyPagination'
import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'

export default function searchQuerySet (searchName, options) {
  if (!searchName.startsWith('for')) {
    searchName = 'for' + capitalize(searchName)
  }
  return Search[searchName](sanitizeOptions(searchName, options))
}

export function fetchSearchQuerySet (searchName, options) {
  return searchQuerySet(searchName, options).fetchAll()
  .then(({ models }) => presentQuerySet(models, options))
}

export function sanitizeOptions (name, options) {
  if (options.first) {
    options.limit = options.first
    delete options.first
  }

  options = Object.assign(
    {},
    defaultOptions.all,
    defaultOptions[name],
    omitBy(x => isNull(x) || isUndefined(x), options)
  )

  const shim = shims[name]
  return shim ? shim(options) : options
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

    if (options.topic) {
      const onlyNumbers = /^\d+$/
      if (!onlyNumbers.test(options.topic)) {
        throw new Error(`invalid value for topic: ${options.topic}. should be an ID`)
      }
      options.tag = options.topic
      delete options.topic
    }

    return mapValues(options, (val, key) => {
      if (key === 'sort') return sortOptionShim[val]
      return val
    })
  }
}
