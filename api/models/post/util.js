/* globals LastRead */
import {
  difference,
  flatten,
  flattenDeep,
  has,
  includes,
  isEqual,
  merge,
  omit,
  pick,
  some,
  uniq,
  values
} from 'lodash'
import { filter, getOr, map } from 'lodash/fp'
import { sanitize } from 'hylo-utils/text'

export const validateGraphqlCreateData = data => {
  if (!data.title) {
    throw new Error('title can\'t be blank')
  }
  if (data.type && !includes(values(Post.Type), data.type)) {
    throw new Error('not a valid type')
  }
  return Promise.resolve()
}

export const convertGraphqlCreateData = data =>
  Promise.resolve(merge({
    name: data.title,
    description: data.details,
    community_ids: data.communityIds,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    parent_post_id: data.parentPostId
  }, data))

export const setupNewPostAttrs = function (userId, params) {
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

const updateTagFollows = (post, transacting) =>
  post.load(['tags', 'communities'], {transacting})
  .then(() => TagFollow.query(q => {
    q.whereIn('tag_id', post.relations.tags.map('id'))
    q.whereIn('community_id', post.relations.communities.map('id'))
  }).query().increment('new_post_count').transacting(transacting))

export const afterSavingThread = function (post, opts) {
  const userId = post.get('user_id')
  const followerIds = [userId].concat(opts.messageTo)
  const trxOpts = pick(opts, 'transacting')

  return Promise.all(flattenDeep([
    map(id => LastRead.findOrCreate(id, post.id, trxOpts), followerIds),
    post.addFollowers(followerIds, userId, trxOpts)
  ]))
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
  .then(() => updateTagFollows(post, trx))
  .then(() => Queue.classMethod('Post', 'createActivities', {postId: post.id}))
  .then(() => Queue.classMethod('Post', 'notifySlack', {postId: post.id}))
}

export const updateChildren = (post, children, trx) => {
  const isNew = child => child.id.startsWith('new')
  const created = filter(c => isNew(c) && !!c.name, children)
  const updated = filter(c => !isNew(c) && !!c.name, children)
  return post.load('children', {transacting: trx})
  .then(() => {
    const existingIds = map('id', post.relations.children.models)
    const removed = filter(id => !includes(map('id', updated), id), existingIds)
    return Promise.all([
      // mark removed posts as inactive
      some(removed) && Post.query().where('id', 'in', removed)
      .update('active', false).transacting(trx),

      // update name and description for updated requests
      Promise.map(updated, child =>
        Post.query().where('id', child.id)
        .update(omit(child, 'id')).transacting(trx)),

      // create new requests
      some(created) && Tag.find('request')
      .then(tag => {
        const attachment = {tag_id: tag.id, selected: true}
        return Promise.map(created, child => {
          const attrs = merge(omit(child, 'id'), {
            parent_post_id: post.id,
            user_id: post.get('user_id'),
            is_project_request: true
          })
          return Post.create(attrs, {transacting: trx})
          .then(post => post.tags().attach(attachment, {transacting: trx}))
        })
      })
    ])
  })
}

const updateMedia = (post, type, url, remove, transacting) => {
  if (!url && !remove) return
  var media = post.relations.media.find(m => m.get('type') === type)

  if (media && remove) { // remove media
    return media.destroy({transacting})
  } else if (media) { // replace url in existing media
    if (media.get('url') !== url) {
      return media.save({url}, {patch: true, transacting})
      .then(media => media.updateMetadata({transacting}))
    }
  } else if (url) { // create new media
    return Media.createForPost(post.id, type, url, transacting)
  }
}

export const updateAllMedia = (post, params, trx) => {
  const mediaParams = [
    'docs', 'removedDocs', 'imageUrl', 'imageRemoved', 'videoUrl', 'videoRemoved'
  ]

  return (some(mediaParams, p => has(params, p))
    ? post.load('media')
    : Promise.resolve())
  .tap(() => updateMedia(post, 'image', params.imageUrl, params.imageRemoved, trx))
  .tap(() => updateMedia(post, 'video', params.videoUrl, params.videoRemoved, trx))
  .tap(() => {
    if (!params.removedDocs) return
    return Promise.map(params.removedDocs, doc => {
      var media = post.relations.media.find(m => m.get('url') === doc.url)
      if (media) return media.destroy({transacting: trx})
    })
  })
  .tap(() => {
    if (!params.docs) return
    return Promise.map(params.docs, doc => {
      var media = post.relations.media.find(m => m.get('url') === doc.url)
      if (!media) return Media.createDoc(post.id, doc, trx)
    })
  })
}

export const updateCommunities = (post, newIds, trx) => {
  const oldIds = post.relations.communities.pluck('id')
  if (!isEqual(newIds, oldIds)) {
    const opts = {transacting: trx}
    const cs = post.communities()
    return Promise.join(
      Promise.map(difference(newIds, oldIds), id => cs.attach(id, opts)),
      Promise.map(difference(oldIds, newIds), id => cs.detach(id, opts))
    )
  }
}

export const createPost = (userId, params) =>
  setupNewPostAttrs(userId, params)
  .then(attrs => bookshelf.transaction(trx =>
    Post.create(attrs, {transacting: trx})
    .tap(post => afterCreatingPost(post, merge(
      pick(params, 'community_ids', 'imageUrl', 'videoUrl', 'docs', 'tag', 'tagDescriptions'),
      {children: params.requests, transacting: trx}
    )))))

export const createThread = (userId, params) =>
  setupNewPostAttrs(userId, params)
  .then(attrs => bookshelf.transaction(trx =>
    Post.create(attrs, {transacting: trx})
    .tap(post => afterSavingThread(post, merge(
      pick(params, 'messageTo'),
      {children: params.requests, transacting: trx}
    )))))

export const addFollowers = (post, comment, userIds, addedById, opts = {}) => {
  var userId = (comment || post).get('user_id')
  const { transacting, createActivity } = opts

  return Promise.map(userIds, followerId =>
    Follow.create(followerId, post.id, (comment || {}).id, {addedById, transacting})
    .tap(follow => {
      if (!createActivity) return

      var updates = []
      const addActivity = (recipientId, method) => {
        updates.push(Activity[method](follow, recipientId)
        .save({}, pick(opts, 'transacting'))
        .then(activity => activity.createNotifications(transacting)))
      }
      if (followerId !== addedById) addActivity(followerId, 'forFollowAdd')
      if (userId !== addedById) addActivity(userId, 'forFollow')
      return Promise.all(updates)
    }))
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

function updateFollowers (post, transacting) {
  return post.load('followers')
  .then(() => {
    const followerIds = post.relations.followers.pluck('id')
    const newMentionedIds = RichText.getUserMentions(post.get('description'))
    .filter(id => !followerIds.includes(id))

    return addFollowers(post, null, newMentionedIds, null, {transacting})
    .then(() => {
      const reasons = newMentionedIds.map(id => ({
        reader_id: id,
        post_id: post.id,
        actor_id: post.get('user_id'),
        reason: 'mention'
      }))
      return Activity.saveForReasons(reasons, transacting)
    })
  })
}
