import { flatten, merge, pick, uniq } from 'lodash'
import setupPostAttrs from './setupPostAttrs'
import updateChildren from './updateChildren'
import { updateNetworkMemberships } from './util'
import { communityRoom, networkRoom, pushToSockets } from '../../services/Websockets'

export default function createPost (userId, params) {
  return setupPostAttrs(userId, merge(Post.newPostAttrs(), params))
  .then(attrs => bookshelf.transaction(transacting =>
    Post.create(attrs, { transacting })
    .tap(post => afterCreatingPost(post, merge(
      pick(params, 'community_ids', 'imageUrl', 'videoUrl', 'docs', 'topicNames', 'memberIds', 'imageUrls', 'fileUrls', 'announcement'),
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
    post.addFollowers(followerIds, trxOpts),

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

    opts.docs && Promise.map(opts.docs, doc => Media.createDoc(post.id, doc, trx)),

  ]))
  .then(() => post.updateProjectMembers(opts.memberIds || [], trxOpts))
  .then(() => Tag.updateForPost(post, opts.topicNames, userId, trx))
  .then(() => updateTagsAndCommunities(post, trx))
  .then(() => updateNetworkMemberships(post, trx))
  .then(() => Queue.classMethod('Post', 'createActivities', {postId: post.id}))
  .then(() => Queue.classMethod('Post', 'notifySlack', {postId: post.id}))
}

async function updateTagsAndCommunities (post, trx) {
  await post.load([
    'communities', 'linkPreview', 'networks', 'tags', 'user'
  ], {transacting: trx})

  const { tags, communities } = post.relations

  // NOTE: the payload object is released to many users, so it cannot be
  // subject to the usual permissions checks (which communities/networks
  // the user is allowed to view, etc). This means we either omit the
  // information, or (as below) we only post community data for the socket
  // room it's being pushed to.
  const payload = post.getNewPostSocketPayload()
  const notifyCommunitySockets = payload.communities.map(c => {
    pushToSockets(
      communityRoom(c.id),
      'newPost',
      Object.assign({}, payload, { communities: [ c ] })
    )
  })
  // TODO: eventually we will need to push to socket rooms for networks.
  const notifyNetworkSockets = payload.networks.map(n => {
    pushToSockets(
      networkRoom(n.id),
      'newPost',
      Object.assign({}, payload, { networks: [ n ] })
    )
  })

  const updateCommunityTags = CommunityTag.query(q => {
    q.whereIn('tag_id', tags.map('id'))
  }).query().update({updated_at: new Date()}).transacting(trx)

  return Promise.all([
    notifyCommunitySockets,
    notifyNetworkSockets,
    updateCommunityTags,

    TagFollow.query(q => {
      q.whereIn('tag_id', tags.map('id'))
      q.whereIn('community_id', communities.map('id'))
      q.whereNot('user_id', post.get('user_id'))
    }).query().increment('new_post_count').transacting(trx),

    GroupMembership.query(q => {
      const groupIds = Group.query(q2 => {
        q2.whereIn('group_data_id', communities.map('id'))
        q2.where('group_data_type', Group.DataType.COMMUNITY)
      }).query().pluck('id')

      q.whereIn('group_id', groupIds)
      q.whereNot('group_memberships.user_id', post.get('user_id'))
      q.where('group_memberships.active', true)
    }).query().increment('new_post_count').transacting(trx)
  ])
}
