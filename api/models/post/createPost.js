import { flatten, includes, isEmpty, merge, pick, uniq, values } from 'lodash'
import { getOr } from 'lodash/fp'
import { sanitize } from 'hylo-utils/text'
import updateChildren from './updateChildren'

export default function createPost (userId, params) {
  return setupNewPostAttrs(userId, params)
  .then(attrs => bookshelf.transaction(trx =>
    Post.create(attrs, {transacting: trx})
    .tap(post => afterCreatingPost(post, merge(
      pick(params, 'community_ids', 'imageUrl', 'videoUrl', 'docs', 'tag', 'tagDescriptions'),
      {children: params.requests, transacting: trx}
    )))))
}

export function validatePostCreateData (userId, data) {
  if (!data.name) {
    throw new Error('title can\'t be blank')
  }
  if (data.type && !includes(values(Post.Type), data.type)) {
    throw new Error('not a valid type')
  }
  if (isEmpty(data.community_ids)) {
    throw new Error('no communities specified')
  }
  return Membership.inAllCommunities(userId, data.community_ids)
  .then(ok => ok ? Promise.resolve() : Promise.reject(new Error('unable to post to all those communities')))
}

function setupNewPostAttrs (userId, params) {
  const attrs = merge(Post.newPostAttrs(), {
    name: sanitize(params.name),
    description: sanitize(params.description),
    user_id: userId,
    visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT,
    link_preview_id: getOr(null, 'id', params.linkPreview),
    parent_post_id: params.parent_post_id
  }, pick(params, 'type', 'starts_at', 'ends_at', 'location', 'created_from'))

  return Promise.resolve(attrs)
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
    opts.imageUrl && Media.createForPost(post.id, 'image', opts.imageUrl, trx),
    opts.videoUrl && Media.createForPost(post.id, 'video', opts.videoUrl, trx),

    opts.children && updateChildren(post, opts.children, trx),

    opts.docs && Promise.map(opts.docs, doc => Media.createDoc(post.id, doc, trx))
  ]))
  .then(() => Tag.updateForPost(post, opts.tag, opts.tagDescriptions, userId, trx))
  .then(() => bumpNewPostCounts(post, trx))
  .then(() => Queue.classMethod('Post', 'createActivities', {postId: post.id}))
  .then(() => Queue.classMethod('Post', 'notifySlack', {postId: post.id}))
}

function bumpNewPostCounts (post, trx) {
  return post.load(['tags', 'communities'], {transacting: trx})
  .then(() => {
    const { tags, communities } = post.relations
    const counterGroups = [
      TagFollow.query(q => {
        q.whereIn('tag_id', tags.map('id'))
        q.whereIn('community_id', communities.map('id'))
      }),
      Membership.query(q => {
        q.whereIn('community_id', communities.map('id'))
        q.where('active', true)
      })
    ]
    return Promise.all(counterGroups.map(group =>
      group.query().increment('new_post_count').transacting(trx)))
  })
}
