import addTermToQueryBuilder from './addTermToQueryBuilder'
import { curry, includes, values } from 'lodash'

export const filterAndSortPosts = curry((opts, q) => {
  const { search, sortBy = 'updated', topic, showPinnedFirst, type, boundingBox } = opts
  const sortColumns = {
    votes: 'num_votes',
    updated: 'posts.updated_at'
  }

  const sort = sortColumns[sortBy] || values(sortColumns).find(v => v === sortBy)
  if (!sort) {
    throw new Error(`Cannot sort by "${sortBy}"`)
  }

  const { DISCUSSION, REQUEST, OFFER, PROJECT, EVENT } = Post.Type

  if (!type || type === 'all' || type === 'all+welcome') {
    q.where(q2 =>
      q2.where('posts.type', 'in', [DISCUSSION, REQUEST, OFFER, PROJECT, EVENT])
      .orWhere('posts.type', null))
  } else if (type === DISCUSSION) {
    q.where(q2 =>
      q2.where({'posts.type': null})
      .orWhere({'posts.type': DISCUSSION}))
  } else {
    if (!includes(values(Post.Type), type)) {
      throw new Error(`unknown post type: "${type}"`)
    }
    q.where({'posts.type': opts.type})
  }

  if (search) {
    addTermToQueryBuilder(search, q, {
      columns: ['posts.name', 'posts.description']
    })
  }

  if (topic) {
    if (/^\d+$/.test(topic)) { // topic ID
      q.join('posts_tags', 'posts_tags.post_id', 'posts.id')
      q.where('posts_tags.tag_id', topic)
    } else { // topic name
      q.join('posts_tags', 'posts_tags.post_id', 'posts.id')
      q.join('tags', 'posts_tags.tag_id', 'tags.id')
      q.where('tags.name', topic)
    }
  }

  if (boundingBox) {
    q.join('locations', 'locations.id', '=', 'posts.location_id')
    q.whereRaw('locations.center && ST_MakeEnvelope(?, ?, ?, ?, 4326)', [boundingBox[0].lng, boundingBox[0].lat, boundingBox[1].lng, boundingBox[1].lat])
  }

  if (sort === 'posts.updated_at' && showPinnedFirst) {
    q.orderByRaw('communities_posts.pinned_at is null asc, communities_posts.pinned_at desc, posts.updated_at desc')
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
    q.orderBy('group_memberships.created_at', 'desc')
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
