import { difference, isEqual, compact, uniq } from 'lodash'

function updateMedia (post, type, urls, transacting) {
  if (!urls) return
  var media = post.relations.media.filter(m => m.get('type') === type)

  return Promise.map(media, m => m.destroy({transacting}))
  .then(() => Promise.map(urls, (url, i) =>
    Media.createForPost({
      postId: post.id, type, url, position: i
    }, transacting)))
}

export function updateAllMedia (post, { imageUrls, fileUrls }, trx) {
  return (imageUrls || fileUrls ? post.load('media') : Promise.resolve())
  .tap(() => updateMedia(post, 'image', imageUrls, trx))
  .tap(() => updateMedia(post, 'file', fileUrls, trx))
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

export async function updateFollowers (post, transacting) {
  const followerIds = await post.followers().fetch().then(f => f.pluck('id'))
  const newMentionedIds = RichText.getUserMentions(post.get('description'))
  .filter(id => !followerIds.includes(id))

  return post.addFollowers(newMentionedIds, {transacting})
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
}

export function updateNetworkMemberships (post, transacting) {
  const opts = {transacting}

  return post.load(['communities', 'networks'], opts)
  .then(() => {
    const newIds = compact(uniq(post.relations.communities.map(c => Number(c.get('network_id'))))).sort()
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
