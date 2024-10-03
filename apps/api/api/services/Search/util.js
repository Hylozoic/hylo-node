import { GraphQLYogaError } from '@graphql-yoga/node'
import { curry, includes, isEmpty, values } from 'lodash'
import moment from 'moment-timezone'
import addTermToQueryBuilder from './addTermToQueryBuilder'

export const filterAndSortPosts = curry((opts, q) => {
  const {
    activePostsOnly = false,
    afterTime,
    beforeTime,
    boundingBox,
    collectionToFilterOut,
    cursor,
    forCollection,
    isAnnouncement,
    isFulfilled,
    order,
    search,
    showPinnedFirst,
    sortBy = 'updated',
    topic,
    type,
    types
  } = opts

  let { topics = [] } = opts

  const sortColumns = {
    created: 'posts.created_at',
    id: 'posts.id',
    order: 'collections_posts.order', // Only works if forCollection is set
    reactions: 'posts.num_people_reacts',
    start_time: 'posts.start_time',
    updated: 'posts.updated_at',
    votes: 'posts.num_people_reacts' // Need to remove once Mobile has been ported to reactions
  }

  const sort = sortColumns[sortBy] || values(sortColumns).find(v => v === 'posts.' + sortBy || v === sortBy)
  if (!sort) {
    throw new GraphQLYogaError(`Cannot sort by "${sortBy}"`)
  }

  if (cursor) {
    if (order === 'asc') {
      q.where('posts.id', '>', cursor)
    } else {
      q.where('posts.id', '<', cursor)
    }
  }

  const { CHAT, DISCUSSION, REQUEST, OFFER, PROJECT, EVENT, RESOURCE, PROPOSAL } = Post.Type

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

  if (activePostsOnly) {
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

  if (forCollection) {
    q.join('collections_posts', (j) => {
      j.on('collections_posts.post_id', '=', 'posts.id')
      j.andOn('collections_posts.collection_id', '=', bookshelf.knex.raw('?', [forCollection]))
    })
    q.whereIn('posts.id', bookshelf.knex.raw('select post_id from collections_posts where collection_id = ?', [forCollection]))
  }

  if (collectionToFilterOut) {
    q.whereNotIn('posts.id', bookshelf.knex.raw('select post_id from collections_posts where collection_id = ?', [collectionToFilterOut]))
  }

  if (types) {
    q.whereIn('posts.type', types)
  } else if (type === 'chat') {
    q.whereIn('posts.type', [CHAT, DISCUSSION, REQUEST, OFFER, PROJECT, PROPOSAL, EVENT, RESOURCE])
  } else if (!type || type === 'all' || type === 'all+welcome') {
    q.whereIn('posts.type', [DISCUSSION, REQUEST, OFFER, PROJECT, PROPOSAL, EVENT, RESOURCE])
  } else {
    if (!includes(values(Post.Type), type)) {
      throw new GraphQLYogaError(`unknown post type: "${type}"`)
    }
    q.where({'posts.type': type})
  }

  if (!isEmpty(search)) {
    addTermToQueryBuilder(search, q, {
      columns: ['posts.name', 'posts.description']
    })
  }

  if (topic) {
    topics = topics.concat(topic)
  }

  if (!isEmpty(topics)) {
    q.join('posts_tags', 'posts_tags.post_id', 'posts.id')
    if (/^\d+$/.test(topics[0])) { // topic ID
      q.whereIn('posts_tags.tag_id', topics)
    } else { // topic name
      q.join('tags', 'posts_tags.tag_id', 'tags.id')
      q.whereIn('tags.name', topics)
    }
  }

  if (boundingBox) {
    q.join('locations', 'locations.id', '=', 'posts.location_id')
    q.whereRaw('locations.center && ST_MakeEnvelope(?, ?, ?, ?, 4326)', [boundingBox[0].lng, boundingBox[0].lat, boundingBox[1].lng, boundingBox[1].lat])
  }

  // This is used to make sure that when viewing posts from child groups too, only pin ones from the parent group
  const primaryGroupId = q.queryContext()?.primaryGroupId

  if (showPinnedFirst) {
    q.orderByRaw(`${primaryGroupId ? `case when groups_posts.group_id = ${primaryGroupId} then groups_posts.pinned_at end desc nulls last` : 'groups_posts.pinned_at desc nulls last'}, ${sort || 'posts.updated_at'} ${order || (sortBy === 'order' ? 'asc' : 'desc')}`)
  } else if (sort) {
    q.orderBy(sort, order || (sortBy === 'order' ? 'asc' : 'desc'))
  }

})

export const filterAndSortUsers = curry(({ autocomplete, boundingBox, groupId, groupRoleId, commonRoleId, order, search, sortBy }, q) => {
  if (autocomplete) {
    addTermToQueryBuilder(autocomplete, q, {
      columns: ['users.name']
    })
  }

  if (groupRoleId) {
    q.leftJoin('group_memberships_group_roles', 'group_memberships_group_roles.user_id', '=', 'users.id')
    q.where('group_memberships_group_roles.group_role_id', '=', groupRoleId)
  }

  if (commonRoleId && groupId) {
    q.leftJoin('group_memberships_common_roles as crgm', 'crgm.user_id', 'users.id')
    q.where('crgm.common_role_id', '=', commonRoleId)
    q.andWhere('crgm.group_id', '=', groupId)
  }

  if (search) {
    q.whereIn('users.id', FullTextSearch.search({
      term: search,
      type: 'person',
      subquery: true
    }))
  }

  if (sortBy && !['name', 'location', 'join', 'last_active_at'].includes(sortBy)) {
    throw new GraphQLYogaError(`Cannot sort by "${sortBy}"`)
  }

  if (order && !['asc', 'desc'].includes(order.toLowerCase())) {
    throw new GraphQLYogaError(`Cannot use sort order "${order}"`)
  }

  if (sortBy === 'join') {
    q.orderBy('group_memberships.created_at', order || 'desc')
  } else if (!sortBy || sortBy === 'name') {
    q.orderByRaw(`lower("users"."name") ${order || 'asc'}`)
  } else {
    q.orderBy(sortBy, order || 'asc')
  }

  if (boundingBox) {
    q.join('locations', 'locations.id', '=', 'users.location_id')
    const bb = [boundingBox[0].lng, boundingBox[0].lat, boundingBox[1].lng, boundingBox[1].lat]
    q.whereRaw('locations.center && ST_MakeEnvelope(?, ?, ?, ?, 4326)', bb)
  }
})

export const filterAndSortGroups = curry((opts, q) => {

  const { search, sortBy = 'name', boundingBox, order } = opts

  if (search) {
    addTermToQueryBuilder(search, q, {
      columns: ['groups.name', 'groups.description', 'groups.location']
    })
  }

  if (boundingBox) {
    q.leftJoin('locations', 'locations.id', '=', 'groups.location_id')
    const bb = [boundingBox[0].lng, boundingBox[0].lat, boundingBox[1].lng, boundingBox[1].lat]
    q.where(q2 =>
      q2.whereRaw('locations.center && ST_MakeEnvelope(?, ?, ?, ?, 4326)', bb)
        .orWhereRaw('ST_Intersects(groups.geo_shape, ST_MakeEnvelope(?, ?, ?, ?, 4326))', bb)
    )
  }

  if (sortBy === 'size') {
    q.with('member_count', bookshelf.knex.raw(`
      SELECT group_id, COUNT(group_id) as size from group_memberships GROUP BY group_id
    `))
    q.join('member_count', 'groups.id', '=', 'member_count.group_id')
  }

  q.orderBy(sortBy || 'name', order || sortBy === 'size' ? 'desc' : 'asc')
})
