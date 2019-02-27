import setupPostAttrs from './setupPostAttrs'
import updateChildren from './updateChildren'
import {
  updateCommunities,
  updateAllMedia,
  updateFollowers,
  updateNetworkMemberships
} from './util'

export default function updatePost (userId, id, params) {
  if (!id) throw new Error('updatePost called with no ID')
  return setupPostAttrs(userId, params)
  .then(attrs => bookshelf.transaction(transacting =>
    Post.find(id).then(post => {
      if (!post) throw new Error('Post not found')
      const updatableTypes = [
        Post.Type.OFFER,
        Post.Type.PROJECT,
        Post.Type.REQUEST,
        Post.Type.DISCUSSION,
        Post.Type.EVENT,        
        null
      ]
      if (!updatableTypes.includes(post.get('type'))) {
        throw new Error("This post can't be modified")
      }

      console.log('updating post with attrs', attrs)

      return post.save(attrs, {patch: true, transacting})
      .tap(updatedPost => afterUpdatingPost(updatedPost, {params, userId, transacting}))
    })))
}

export function afterUpdatingPost (post, opts) {
  const {
    params,
    params: { requests, community_ids, topicNames, memberIds },
    userId,
    transacting    
  } = opts

  return post.ensureLoad(['communities'])
  .then(() => Promise.all([
    updateChildren(post, requests, transacting),
    updateCommunities(post, community_ids, transacting),
    updateAllMedia(post, params, transacting),
    Tag.updateForPost(post, topicNames, userId, transacting),
    updateFollowers(post, transacting)
  ]))
  .then(() => memberIds && post.updateProjectMembers(memberIds, {transacting}))
  .then(() => updateNetworkMemberships(post, transacting))
}
