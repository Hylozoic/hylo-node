import { compact } from 'lodash'

export function restoreTypes (limit = 2000) {
  const { REQUEST, OFFER, RESOURCE } = Post.Type

  return Post.where('type', null).query(q => {
    q.limit(limit)
  }).fetchAll({withRelated: 'selectedTags'})
  .then(posts => Promise.map(posts.models, post => {
    const tag = post.relations.selectedTags.first()

    if (tag && [REQUEST, OFFER, RESOURCE].includes(tag.get('name'))) {
      return post.save({type: tag.get('name')}, {patch: true})
    }
  }))
  .then(saves => compact(saves).length)
}
