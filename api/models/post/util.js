import {
  flatten, includes, merge, omit, pick, some, uniq, values, without
} from 'lodash'
import { filter, map, negate } from 'lodash/fp'

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

  if (!attrs.type) {
    attrs.type = postTypeFromTag(params.tag)
  }

  if (params.projectId) {
    return Project.find(params.projectId)
    .then(project => {
      if (project && project.isDraft()) attrs.visibility = Post.Visibility.DRAFT_PROJECT
      return attrs
    })
  }

  return Promise.resolve(attrs)
}

export const afterSavingPost = (post, opts) => {
  const userId = post.get('user_id')
  const mentioned = RichText.getUserMentions(post.get('description'))
  const followerIds = uniq(mentioned.concat(userId))

  // no need to specify community ids explicitly if saving for a project
  return (() => {
    if (opts.communities) return Promise.resolve(opts.communities)
    return Project.find(opts.projectId, pick(opts, 'transacting')).then(p => [p.get('community_id')])
  })()
  .then(communities => Promise.all(flatten([
    // Attach post to communities
    communities.map(id =>
      new Community({id}).posts().attach(post.id, pick(opts, 'transacting'))),

    // Add mentioned users and creator as followers
    post.addFollowers(followerIds, userId, pick(opts, 'transacting')),

    // create activity and send notification to all mentioned users except the creator
    Promise.map(without(mentioned, userId), mentionedUserId =>
      Post.notifyAboutMention(post, mentionedUserId, pick(opts, 'transacting'))),

    // Add media, if any
    opts.imageUrl && Media.createForPost(post.id, 'image', opts.imageUrl, opts.transacting),
    opts.videoUrl && Media.createForPost(post.id, 'video', opts.videoUrl, opts.transacting),

    opts.docs && Promise.map(opts.docs, doc =>
      Media.createDoc(post.id, doc, opts.transacting)),

    Queue.classMethod('Post', 'sendPushNotifications', {postId: post.id}),

    opts.projectId && PostProjectMembership.create(
      post.id, opts.projectId, pick(opts, 'transacting')),

    opts.projectId && Queue.classMethod('Project', 'notifyAboutNewPost', {
      projectId: opts.projectId,
      postId: post.id,
      exclude: mentioned
    }),

    opts.children && updateChildren(post, opts.children, opts.transacting)
  ]))
  .then(() => Tag.updateForPost(post, opts.tag || post.get('type'), opts.transacting)))
}

export const updateChildren = (post, children, trx) => {
  const isNew = child => child.id.startsWith('new')
  const created = filter(isNew, children)
  const updated = filter(negate(isNew), children)
  return post.load('children', {transacting: trx})
  .then(() => {
    const existingIds = map('id', post.relations.children)
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
