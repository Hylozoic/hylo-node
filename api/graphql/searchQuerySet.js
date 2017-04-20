import { mapValues } from 'lodash'

export default function searchQuerySet (searchName, options) {
  const opts = shimOptions(searchName, options)
  return Search[searchName](opts).fetchAll()
  .then(({ length, models }) => {
    const items = models

    const total = models.length > 0
      ? Number(models[0].get('total'))
      : 0
    return {
      total,
      items,
      hasMore: options.offset + options.limit < total
    }
  })
}

// this is for shimming between the existing Search code, with its warts and its
// accommodations for legacy code, and the GraphQL schema, which we want to be a
// good domain language without weird implementation details poking through.
const optionShims = {
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
    // TODO
  }
}

function shimOptions (name, options) {
  const shim = optionShims[name]
  if (!shim) throw new Error(`no option shim for ${name}`)
  return shim(options)
}
