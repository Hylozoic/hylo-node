import setupPostAttrs from './setupPostAttrs'
import updateChildren from './updateChildren'
import {
  updateGroups,
  updateAllMedia,
  updateFollowers
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
        Post.Type.RESOURCE,
        Post.Type.DISCUSSION,
        Post.Type.EVENT,
        null
      ]
      if (!updatableTypes.includes(post.get('type'))) {
        throw new Error("This post can't be modified")
      }

      return post.save(attrs, {patch: true, transacting})
      .tap(updatedPost => afterUpdatingPost(updatedPost, {params, userId, transacting}))
    })))
}

export function afterUpdatingPost (post, opts) {
  const {
    params,
    params: { requests, group_ids, topicNames, memberIds, eventInviteeIds },
    userId,
    transacting
  } = opts

  return post.ensureLoad(['groups'])
  .then(() => Promise.all([
    updateChildren(post, requests, transacting),
    updateGroups(post, group_ids, transacting),
    updateAllMedia(post, params, transacting),
    Tag.updateForPost(post, topicNames, userId, transacting),
    updateFollowers(post, transacting)
  ]))
  .then(() => memberIds && post.setProjectMembers(memberIds, {transacting}))
  .then(() => eventInviteeIds && post.updateEventInvitees(eventInviteeIds, userId, {transacting}))
}
