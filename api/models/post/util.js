import {
  difference, flatten, flattenDeep, has, includes, isEqual, merge, omit, pick, some, uniq
} from 'lodash'
import { filter, get, map } from 'lodash/fp'
import { sanitize } from 'hylo-utils/text'

export const setupNewPostAttrs = function (userId, params) {
  const attrs = merge(Post.newPostAttrs(), {
    name: sanitize(params.name),
    description: sanitize(params.description),
    user_id: userId,
    visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT,
    link_preview_id: get('id', params.linkPreview)
  }, pick(params, 'type', 'start_time', 'end_time', 'location', 'created_from'))

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
  const trx = opts.transacting
  const trxOpts = pick(opts, 'transacting')

  return Promise.all(flattenDeep([
    map(id => LastRead.findOrCreate(id, post.id, { trx }), followerIds),
    post.addFollowers(followerIds, userId, trxOpts)
  ]))
}

export const afterSavingPost = function (post, opts) {
  const userId = post.get('user_id')
  const mentioned = RichText.getUserMentions(post.get('description'))
  const followerIds = uniq([userId].concat((opts.messageTo || mentioned)))
  const trx = opts.transacting
  const trxOpts = pick(opts, 'transacting')

  return Promise.all(flatten([
    post.communities().attach(opts.community_ids, trxOpts),

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
  .then(() => Tag.updateForPost(post, opts.tag, opts.tagDescriptions, trx))
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
            user_id: post.get('user_id')
          })
          return Post.create(attrs, {transacting: trx})
          .then(post => post.tags().attach(attachment, {transacting: trx}))
        })
      })
    ])
  })
}

const updateMedia = (post, type, url, remove, trx) => {
  if (!url && !remove) return
  var media = post.relations.media.find(m => m.get('type') === type)

  if (media && remove) { // remove media
    return media.destroy({transacting: trx})
  } else if (media) { // replace url in existing media
    if (media.get('url') !== url) {
      return media.save({url: url}, {patch: true, transacting: trx})
      .then(media => media.updateDimensions({patch: true, transacting: trx}))
    }
  } else if (url) { // create new media
    return Media.createForPost(post.id, type, url, trx)
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
    .tap(post => afterSavingPost(post, merge(
      pick(params, 'community_ids', 'imageUrl', 'videoUrl', 'docs', 'tag', 'tagDescriptions', 'messageTo'),
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
