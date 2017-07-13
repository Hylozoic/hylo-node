import { difference, has, isEqual, pick, some, compact } from 'lodash'

function updateMedia (post, type, url, remove, transacting) {
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

export function updateAllMedia (post, params, trx) {
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

export function updateCommunities (post, newIds, trx) {
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

export function addFollowers (post, comment, userIds, addedById, opts = {}) {
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

export function updateFollowers (post, transacting) {
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

export function updateNetworkMemberships (post, transacting) {
  const opts = {transacting}

  return post.load(['communities', 'networks'], opts)
  .then(() => {
    const newIds = compact(post.relations.communities.map(c => Number(c.get('network_id')))).sort()
    const oldIds = post.relations.networks.pluck('id').sort()
    if (!isEqual(newIds, oldIds)) {
      const ns = post.networks()
      return Promise.join(
        Promise.map(difference(newIds, oldIds), id => ns.attach(id, opts)),
        Promise.map(difference(oldIds, newIds), id => ns.detach(id, opts))
      )
    }
  })
}
