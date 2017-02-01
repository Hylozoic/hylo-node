import { get, merge, pick, reduce } from 'lodash'

export const fetchAndPresentFollowed = (communityId, userId) => {
  return TagFollow.query(q => {
    q.leftJoin('communities_tags', 'communities_tags.tag_id', 'tag_follows.tag_id')
    q.where({'tag_follows.user_id': userId})
    q.whereRaw(`(tag_follows.community_id = communities_tags.community_id
      or communities_tags.community_id is null)`)
    if (communityId) {
      q.where({'tag_follows.community_id': communityId})
      q.select(bookshelf.knex.raw('tag_follows.*, is_default'))
    }
  })
  .fetchAll({withRelated: ['tag', 'community']})
  .then(joins => reduce(joins.models, (m, join) => {
    const slug = join.relations.community.get('slug')
    if (!m[slug]) m[slug] = []
    const row = {
      name: join.relations.tag.get('name'),
      new_post_count: join.get('new_post_count'),
      is_default: join.get('is_default')
    }
    m[slug].push(row)
    return m
  }, {}))
}

export const presentTag = tag => {
  return {
    id: tag.id,
    name: tag.get('name')
  }
}

export const fetchAndPresentForCommunity = (communityId, opts = {}) => {
  var total
  const { raw } = bookshelf.knex

  return Tag.query(q => {
    q.select(raw(`tags.*, communities_tags.created_at, count(*) over () as total,
      count(tag_follows.id) as followers`))

    q.join('communities_tags', 'communities_tags.tag_id', 'tags.id')
    q.where('communities_tags.community_id', communityId)

    q.leftJoin('tag_follows', 'tag_follows.tag_id', 'tags.id')
    q.where(function () {
      this.where('tag_follows.community_id', communityId)
      .orWhere('tag_follows.community_id', null)
    })

    q.limit(opts.limit || 20)
    q.offset(opts.offset || 0)
    if (opts.sort === 'popularity') {
      q.orderBy('followers', 'desc')
      q.orderBy('communities_tags.created_at', 'desc')
    } else {
      q.orderBy('is_default', 'desc')
      q.orderBy(raw('lower(name)'), 'asc')
    }
    q.groupBy(['tags.id', 'is_default', 'communities_tags.created_at'])
  })
  .fetchAll({
    withRelated: [
      {memberships: q => q.where('community_id', communityId)},
      {'memberships.owner': q => q.column('users.id', 'name', 'avatar_url')}
    ]
  })
  .tap(tags => total = tags.first() ? Number(tags.first().get('total')) : 0)
  .then(tags => tags.map(t => {
    const attrs = {
      id: t.id,
      name: t.get('name'),
      memberships: t.relations.memberships.map(m => merge(
        pick(m.toJSON(), 'community_id', 'description', 'is_default', 'created_at', 'owner'),
        {follower_count: Number(t.get('followers'))}
      ))
    }
    return attrs
  }))
  .then(items => ({items, total}))
}

const mostActiveMembers = (community, tag) => {
  const subq = PostMembership.query(q => {
    q.select('post_id')
    q.where({community_id: community.id})
  }).query()
  return User.query(q => {
    q.select(bookshelf.knex.raw('users.name, users.id, users.avatar_url, count(*)'))
    q.join('posts', 'posts.user_id', '=', 'users.id')
    q.join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
    q.where('tag_id', '=', tag.id)
    q.whereIn('posts.id', subq)
    q.groupBy('users.id')
    q.orderBy('count', 'desc')
    q.limit(3)
  })
  .fetchAll()
  .then(users => Promise.map(users.models, user => ({
    id: user.id,
    name: user.get('name'),
    avatar_url: user.get('avatar_url'),
    post_count: Number(user.get('count'))
  })))
}

export const fetchAndPresentSummary = (community, tag) =>
  Promise.join(
    CommunityTag.where({community_id: community.id, tag_id: tag.id}).fetch(),
    TagFollow.where({community_id: community.id, tag_id: tag.id}).count(),
    CommunityTag.taggedPostCount(community.id, tag.id),
    mostActiveMembers(community, tag),
    (ct, followerCount, postCount, activeMembers) => ({
      description: ct && ct.get('description'),
      follower_count: Number(followerCount),
      post_count: Number(postCount),
      active_members: activeMembers
    }))
