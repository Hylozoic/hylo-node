import setupPostAttrs from './setupPostAttrs'
import updateChildren from './updateChildren'
import {
  updateCommunities,
  updateAllMedia,
  updateFollowers
} from './util'

export default function updatePost (userId, id, params) {
  if (!id) throw new Error('updatePost called with no ID')
  return setupPostAttrs(userId, params)
  .then(attrs => bookshelf.transaction(transacting =>
    Post.find(id).then(post =>
      post.save(attrs, {patch: true, transacting})
      .tap(updatedPost => afterUpdatingPost(updatedPost, {params, userId, transacting}))
    )))
}

export function afterUpdatingPost (post, opts) {
  const {
    params,
    params: { requests, community_ids, tag, tagDescriptions },
    userId,
    transacting
  } = opts

  return post.ensureLoad(['communities'])
  .then(() => Promise.all([
    updateChildren(post, requests, transacting),
    updateCommunities(post, community_ids, transacting),
    updateAllMedia(post, params, transacting),
    Tag.updateForPost(post, tag, tagDescriptions, userId, transacting),
    updateFollowers(post, transacting)
  ]))
}
