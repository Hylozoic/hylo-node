import addTermToQueryBuilder from './addTermToQueryBuilder'
import { curry, values } from 'lodash'

export const filterAndSortPosts = curry(({ search, sortBy = 'updated', topic, showPinnedFirst }, q) => {
  const sortColumns = {
    votes: 'num_votes',
    updated: 'posts.updated_at'
  }

  const sort = sortColumns[sortBy] || values(sortColumns).find(v => v === sortBy)
  if (!sort) {
    throw new Error(`Cannot sort by "${sortBy}"`)
  }

  if (search) {
    addTermToQueryBuilder(search, q, {
      columns: ['posts.name', 'posts.description']
    })
  }

  if (topic) {
    const onlyNumbers = /^\d+$/
    if (!onlyNumbers.test(topic)) {
      throw new Error(`invalid value for topic: ${topic}. should be an ID`)
    }

    q.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
    q.whereIn('posts_tags.tag_id', [topic])
  }

  if (sort === 'posts.updated_at' && showPinnedFirst) {
    q.orderByRaw('communities_posts.pinned desc, posts.updated_at desc')
  } else if (sort) {
    q.orderBy(sort, 'desc')
  }
})

export const filterAndSortUsers = curry(({ autocomplete, search, sortBy }, q) => {
  if (autocomplete) {
    addTermToQueryBuilder(autocomplete, q, {
      columns: ['users.name']
    })
  }

  if (search) {
    q.where('users.id', 'in', FullTextSearch.search({
      term: search,
      type: 'person',
      subquery: true
    }))
  }

  if (sortBy && !['name', 'location', 'join'].includes(sortBy)) {
    throw new Error(`Cannot sort by "${sortBy}"`)
  }

  if (sortBy === 'join') {
    q.orderBy('communities_users.created_at', 'desc')
  } else {
    q.orderBy(sortBy || 'name', 'asc')
  }
})

export const filterAndSortCommunities = curry(({ search, sortBy = 'name' }, q) => {
  if (search) {
    addTermToQueryBuilder(search, q, {
      columns: ['communities.name']
    })
  }

  q.orderBy(sortBy)
})
