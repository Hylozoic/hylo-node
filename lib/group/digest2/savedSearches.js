import { merge, pick, pickBy } from 'lodash/fp'
import { TextHelpers } from 'hylo-shared'
import { pluralize } from '../../util/normalize'
import { presentAuthor } from '../digest2/formatData'
import { sendToUser } from '../digest2'

const presentPost = async (p, context, slug) => {
  const post = await Post.where({id: p.id}).fetch()
  await post.load(['linkPreview','user'])
  const { linkPreview } = post.relations
  return pickBy(x => x, {
    id: post.id,
    title: post.summary(),
    details: RichText.qualifyLinks(post.details(), slug),
    user: presentAuthor(post),
    url: Frontend.Route.mapPost(post, context, slug),
    location: post.get('location'),
    when: post.get('start_time')
      ? TextHelpers.formatDatePair(post.get('start_time'), post.get('end_time'), false, post.get('timezone'))
      : undefined,
    link_preview: linkPreview && linkPreview.id &&
      linkPreview.pick('title', 'description', 'url', 'image_url')
  })
}

const prepareDigestData = async (searchId) => {
  const search = await SavedSearch.where({ id: searchId }).fetch()
  const context = search.get('context')
  let group, slug
  if (context === 'groups') {
    group = await search.group()
    slug = group.get('slug')
  }
  const user = await User.where({ id: search.get('user_id') }).fetch()
  const lastPostId = parseInt(search.get('last_post_id'))
  const data = {
    context,
    group_name: group && group.get('name'),
    lastPostId,
    search,
    user
  }
  const posts = await search.newPosts()
  const promises = posts.map(async (p) => {
    const key = pluralize(p.type)
    const presented = await presentPost(p, context, slug)
    data[key] = data[key] || []
    data[key].push(presented)
    data.lastPostId = Math.max(data.lastPostId, parseInt(p.id))
    return data
  })
  await Promise.all(promises)
  return data
}

const shouldSendData = (data, user, type) => {
  const postTypes = ['requests', 'offers', 'events', 'discussions', 'projects', 'resources']
  const hasNewPosts = Object.keys(pick(postTypes, data)).some(s => postTypes.includes(s))
  const userSettingMatchesType = user.get('settings')['digest_frequency'] === type
  return hasNewPosts && userSettingMatchesType
}

const sendDigest = async (searchId, type) => {
  return await prepareDigestData(searchId).then(async data => {
    const { lastPostId, user } = data
    if (shouldSendData(data, user, type)) return merge(await sendToUser(user, type, data), { lastPostId })
  })
  .then(async (sent = {}) => {
    const { lastPostId, success } = sent
    if (success) {
      const search = await SavedSearch.where({ id: searchId }).fetch()
      return await search.updateLastPost(searchId, lastPostId)
    }
  })
}

export const sendAllDigests = async (type) => {
  const savedSearches = await SavedSearch.where({ is_active: true }).query()
  const promises = savedSearches.map(s => sendDigest(s.id, type))
  await Promise.all(promises)
}
