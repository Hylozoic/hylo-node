const { GraphQLYogaError } = require('@graphql-yoga/node')
import setupPostAttrs from './setupPostAttrs'
import updateChildren from './updateChildren'
import { isEqual } from 'lodash'
import {
  updateGroups,
  updateAllMedia,
  updateFollowers
} from './util'

export default function updatePost (userId, id, params) {
  if (!id) throw new GraphQLYogaError('updatePost called with no ID')
  return setupPostAttrs(userId, params)
    .then(attrs => bookshelf.transaction(transacting =>
      Post.find(id).then(post => {
        if (!post) throw new GraphQLYogaError('Post not found')
        const updatableTypes = [
          Post.Type.CHAT,
          Post.Type.DISCUSSION,
          Post.Type.EVENT,
          Post.Type.OFFER,
          Post.Type.PROJECT,
          Post.Type.PROPOSAL,
          Post.Type.REQUEST,
          Post.Type.RESOURCE
        ]
        if (!updatableTypes.includes(post.get('type'))) {
          throw new GraphQLYogaError("This post can't be modified")
        }

        if (!isEqual(post.details(), params.description) || !isEqual(post.title(), params.name)) {
          attrs.edited_at = new Date()
        }

        return post.save(attrs, { patch: true, transacting })
          .tap(updatedPost => afterUpdatingPost(updatedPost, { params, userId, transacting }))
      })))
}

export function afterUpdatingPost (post, opts) {
  const {
    params,
    params: { requests, group_ids, topicNames, memberIds, eventInviteeIds, proposalOptions },
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
    .then(() => post.get('type') === 'project' && memberIds && post.setProjectMembers(memberIds, { transacting }))
    .then(() => post.get('type') === 'event' && eventInviteeIds && post.updateEventInvitees(eventInviteeIds, userId, { transacting }))
    .then(() => post.get('type') === 'proposal' && proposalOptions && post.updateProposalOptions({ options: proposalOptions, userId, opts: { transacting } }))
}
