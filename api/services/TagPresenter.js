import { filter, includes, map, merge, find } from 'lodash'

export const fetchAndPresentTagJoins = (joinClass, communityId, userId) =>
  joinClass.where({community_id: communityId, user_id: userId})
  .fetchAll({withRelated: 'tag'})
  .then(joins =>
    joins.map(join => ({
      name: join.relations.tag.get('name'),
      new_post_count: join.get('new_post_count')
    })))

export const fetchAndPresentFollowed = (communityId, userId) =>
  fetchAndPresentTagJoins(TagFollow, communityId, userId)

export const fetchAndPresentCreated = (communityId, userId) =>
  fetchAndPresentTagJoins(CommunityTag, communityId, userId)

export const withRelatedSpecialPost = {
  withRelated: [
    {posts: q => {
      q.where('posts_tags.selected', true)
      q.where('post.type', 'in', ['event', 'project'])
    }}
  ]
}

export const presentWithPost = tag => {
  const post = tag.relations.posts.first()
  return {
    id: tag.id,
    name: tag.get('name'),
    post: post ? {id: post.id} : null
  }
}

export const fetchAndPresentForLeftNav = (communityId, userId) =>
  Promise.join(
    fetchAndPresentFollowed(communityId, userId),
    fetchAndPresentCreated(communityId, userId),
    (followed, created) => ({
      followed: filter(followed, f => !includes(map(created, 'name'), f.name)),
      created: map(created, c =>
        includes(map(followed, 'name'), c.name)
        ? merge(c, {new_post_count: find(followed, f => f.name === c.name).new_post_count})
        : c)
    }))
