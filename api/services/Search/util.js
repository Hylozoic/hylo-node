import { curry, includes, values } from 'lodash'
import moment from 'moment'
import addTermToQueryBuilder from './addTermToQueryBuilder'

export const filterAndSortPosts = curry((opts, q) => {
  const { afterTime, beforeTime, boundingBox, isAnnouncement, isFulfilled, order = 'desc', search, showPinnedFirst, sortBy = 'updated', topic, type } = opts
  const sortColumns = {
    votes: 'posts.num_votes',
    updated: 'posts.updated_at',
    created: 'posts.created_at',
    start_time: 'posts.start_time'
  }

  const sort = sortColumns[sortBy] || values(sortColumns).find(v => v === 'posts.' + sortBy || v === sortBy)
  if (!sort) {
    throw new Error(`Cannot sort by "${sortBy}"`)
  }

  const { DISCUSSION, REQUEST, OFFER, PROJECT, EVENT, RESOURCE } = Post.Type

  if (isAnnouncement) {
    q.where('announcement', true).andWhere('posts.created_at', '>=', moment().subtract(1, 'month').toDate())
  }

  if (isFulfilled === true) {
    q.where(q2 => {
      q2.whereNotNull('posts.fulfilled_at')
      .orWhere('posts.end_time', '<', moment().toDate())
    })
  } else if (isFulfilled === false) {
    q.whereNull('posts.fulfilled_at')
    .andWhere(q2 => {
      q2.whereNull('posts.end_time')
      .orWhere('posts.end_time', '>=', moment().toDate())
    })
  }

  if (afterTime) {
    q.where(q2 =>
      q2.where('posts.start_time', '>=', afterTime)
      .orWhere('posts.end_time', '>=', afterTime)
    )
  }

  if (beforeTime) {
    q.where(q2 =>
      q2.where('posts.start_time', '<', beforeTime)
      .andWhere('posts.end_time', '<', beforeTime)
    )
  }

  if (!type || type === 'all' || type === 'all+welcome') {
    q.where(q2 =>
      q2.whereIn('posts.type', [DISCUSSION, REQUEST, OFFER, PROJECT, EVENT, RESOURCE])
      .orWhere('posts.type', null))
  } else if (type === DISCUSSION) {
    q.where(q2 =>
      q2.where({'posts.type': null})
      .orWhere({'posts.type': DISCUSSION}))
  } else if (type === 'offersAndRequests') {
    q.where(q2 =>
      q2.where('posts.type', OFFER).orWhere('posts.type', REQUEST)
    )
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
    q.orderByRaw('groups_posts.pinned_at is null asc, groups_posts.pinned_at desc, posts.updated_at desc')
  } else if (sort) {
    q.orderBy(sort, order || 'desc')
  }

})

export const filterAndSortUsers = curry(({ autocomplete, boundingBox, order, search, sortBy }, q) => {
  if (autocomplete) {
    addTermToQueryBuilder(autocomplete, q, {
      columns: ['users.name']
    })
  }

  if (search) {
    q.whereIn('users.id', FullTextSearch.search({
      term: search,
      type: 'person',
      subquery: true
    }))
  }

  if (sortBy && !['name', 'location', 'join', 'last_active_at'].includes(sortBy)) {
    throw new Error(`Cannot sort by "${sortBy}"`)
  }

  if (sortBy === 'join') {
    q.orderBy('group_memberships.created_at', order || 'desc')
  } else {
    q.orderBy(sortBy || 'name', order || 'asc')
  }

  if (boundingBox) {
    q.join('locations', 'locations.id', '=', 'users.location_id')
    q.whereRaw('locations.center && ST_MakeEnvelope(?, ?, ?, ?, 4326)', [boundingBox[0].lng, boundingBox[0].lat, boundingBox[1].lng, boundingBox[1].lat])
  }
})

export const filterAndSortGroups = curry((opts, q) => {
  const { search, sortBy = 'name', boundingBox } = opts

  if (search) {
    addTermToQueryBuilder(search, q, {
      columns: ['groups.name']
    })
  }

  if (boundingBox) {
    q.join('locations', 'locations.id', '=', 'groups.location_id')
    q.whereRaw('locations.center && ST_MakeEnvelope(?, ?, ?, ?, 4326)', [boundingBox[0].lng, boundingBox[0].lat, boundingBox[1].lng, boundingBox[1].lat])
  }

  q.orderBy(sortBy)
})
