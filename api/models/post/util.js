import {
  flatten, includes, merge, omit, pick, some, uniq, values
} from 'lodash'
import { filter, map } from 'lodash/fp'

export const postTypeFromTag = tagName => {
  if (tagName && includes(values(Post.Type), tagName)) {
    return tagName
  } else {
    return Post.Type.CHAT
  }
}

export const setupNewPostAttrs = function (userId, params) {
  const attrs = merge(Post.newPostAttrs(), {
    name: RichText.sanitize(params.name),
    description: RichText.sanitize(params.description),
    user_id: userId,
    visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT
  }, pick(params, 'type', 'start_time', 'end_time', 'location', 'created_from'))

  return Promise.resolve(attrs)
}

const updateTagFollows = (post, trxOpts) => post.load('tags', trxOpts)
  .then(() => post.load('communities', trxOpts))
  .then(() => TagFollow.query(q => {
    q.whereIn('tag_id', post.relations.tags.map('id'))
    q.whereIn('community_id', post.relations.communities.map('id'))
  }).query().increment('new_post_count').transacting(trxOpts.transacting))

export const afterSavingPost = function (post, opts) {
  const userId = post.get('user_id')
  const mentioned = RichText.getUserMentions(post.get('description'))
  const followerIds = uniq(mentioned.concat(userId))
  const trx = opts.transacting
  const trxOpts = pick(opts, 'transacting')

  return Promise.all(flatten([
    // Attach post to communities
    opts.communities.map(id => new Community({id: id}).posts().attach(post.id, trxOpts)),

    // Add mentioned users and creator as followers
    post.addFollowers(followerIds, userId, trxOpts),

    // Add media, if any
    opts.imageUrl && Media.createForPost(post.id, 'image', opts.imageUrl, trx),
    opts.videoUrl && Media.createForPost(post.id, 'video', opts.videoUrl, trx),

    opts.children && updateChildren(post, opts.children, trx),

    opts.docs && Promise.map(opts.docs, doc => Media.createDoc(post.id, doc, trx))
  ]))
  .then(() => Tag.updateForPost(post, opts.tag || post.get('type'), trx))
  .then(() => updateTagFollows(post, trxOpts))
  .then(() => Queue.classMethod('Post', 'createActivities', {postId: post.id}))
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

export const updateMedia = (post, type, url, remove, trx) => {
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
