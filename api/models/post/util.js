import { difference, has, isEqual, pick, some, compact } from 'lodash'

function updateMedia (post, type, urls, transacting) {
  if (!urls) return
  var media = post.relations.media.filter(m => m.get('type') === type)

  return Promise.map(media, m => m.destroy({transacting}))
  .then(() => Promise.map(urls, (url, i) =>
    Media.createForPost({
      postId: post.id, type, url, position: i
    }, transacting)))
}

export function updateAllMedia (post, params, trx) {
  const mediaParams = [
    'docs', 'removedDocs', 'imageUrl', 'imageRemoved', 'videoUrl', 'videoRemoved',
    'imageUrls', 'fileUrls'
  ]

  return (some(mediaParams, p => has(params, p))
    ? post.load('media')
    : Promise.resolve())
  .tap(() => updateMedia(post, 'image', params.imageUrls, trx))
  .tap(() => updateMedia(post, 'file', params.fileUrls, trx))
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
      if (!createActivity || !follow) return

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
    .then(follows => {
      const newFollowerIds = compact(follows).map(f => f.get('user_id'))
      // this check removes any ids that don't correspond to valid users, which
      // can happen if the post mentioned a user and then that user was deleted
      const validMentionedIds = newMentionedIds.filter(id =>
        newFollowerIds.includes(id))

      const reasons = validMentionedIds.map(id => ({
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
