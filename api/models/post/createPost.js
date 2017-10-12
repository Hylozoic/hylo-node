import { flatten, merge, pick, uniq } from 'lodash'
import setupPostAttrs from './setupPostAttrs'
import updateChildren from './updateChildren'
import { updateNetworkMemberships } from './util'
import { communityRoom, pushToSockets } from '../../services/Websockets'

export default function createPost (userId, params) {
  return setupPostAttrs(userId, merge(Post.newPostAttrs(), params))
  .then(attrs => bookshelf.transaction(transacting =>
    Post.create(attrs, { transacting })
    .tap(post => afterCreatingPost(post, merge(
      pick(params, 'community_ids', 'imageUrl', 'videoUrl', 'docs', 'tag', 'tagDescriptions', 'imageUrls', 'fileUrls'),
      {children: params.requests, transacting}
    )))))
}

export function afterCreatingPost (post, opts) {
  const userId = post.get('user_id')
  const mentioned = RichText.getUserMentions(post.get('description'))
  const followerIds = uniq(mentioned.concat(userId))
  const trx = opts.transacting
  const trxOpts = pick(opts, 'transacting')

  return Promise.all(flatten([
    opts.community_ids && post.communities().attach(uniq(opts.community_ids), trxOpts),

    // Add mentioned users and creator as followers
    post.addFollowers(followerIds, userId, trxOpts),

    // Add creator to RSVPs
    post.get('type') === 'event' &&
      EventResponse.create(post.id, {responderId: userId, response: 'yes', transacting: trx}),

    // Add media, if any
    // redux version
    opts.imageUrl && Media.createForPost({
      postId: post.id, type: 'image', url: opts.imageUrl
    }, trx),

    opts.videoUrl && Media.createForPost({
      postId: post.id, type: 'video', url: opts.videoUrl
    }, trx),

    // evo version
    opts.imageUrls && Promise.map(opts.imageUrls, (url, i) =>
      Media.createForPost({
        postId: post.id, type: 'image', url, position: i
      }, trx)),

    // evo version
    opts.fileUrls && Promise.map(opts.fileUrls, (url, i) =>
      Media.createForPost({
        postId: post.id, type: 'file', url, position: i
      }, trx)),

    opts.children && updateChildren(post, opts.children, trx),

    opts.docs && Promise.map(opts.docs, doc => Media.createDoc(post.id, doc, trx))
  ]))
  .then(() => Tag.updateForPost(post, opts.tag, opts.tagDescriptions, userId, trx))
  .then(() => updateTagsAndCommunities(post, trx))
  .then(() => updateNetworkMemberships(post, trx))
  .then(() => Queue.classMethod('Post', 'createActivities', {postId: post.id}))
  .then(() => Queue.classMethod('Post', 'notifySlack', {postId: post.id}))
}

function updateTagsAndCommunities (post, trx) {
  return post.load([
    'attachments', 'communities', 'linkPreview', 'networks', 'tags', 'user'
  ], {transacting: trx})
  .then(() => {
    const { tags, communities } = post.relations
    const bumpCounts = [
      TagFollow.query(q => {
        q.whereIn('tag_id', tags.map('id'))
        q.whereIn('community_id', communities.map('id'))
        q.whereNot('user_id', post.get('user_id'))
      }),
      Membership.query(q => {
        q.whereIn('community_id', communities.map('id'))
        q.where('active', true)
        q.whereNot('user_id', post.get('user_id'))
      })
    ].map(group => group.query().increment('new_post_count').transacting(trx))

    // NOTE: the payload object is released to many users, so it cannot be
    // subject to the usual permissions checks (which communities/networks
    // the user is allowed to view, etc). This means we either omit the
    // information, or (as below) we only post community data for the socket
    // room it's being pushed to.
    // TODO: eventually we will need to push to socket rooms for networks.
    const payload = post.getNewPostSocketPayload()
    const notifySockets = communities.map(c => {
      const communities = [ c ]
      pushToSockets(
        communityRoom(c.id),
        'newPost',
        Object.assign({}, payload, { communities })
      )
    })

    const updateCommunityTags = CommunityTag.query(q => {
      q.whereIn('tag_id', tags.map('id'))
    }).query().update({updated_at: new Date()}).transacting(trx)

    return Promise.all(bumpCounts.concat([notifySockets, updateCommunityTags]))
  })
}
