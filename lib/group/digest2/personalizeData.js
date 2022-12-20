import { cloneDeep, compact, flatten, merge, pick, values } from 'lodash'
import { flatMap, flow, map, sortBy, uniqBy, includes, filter, get } from 'lodash/fp'
import qs from 'querystring'
import cheerio from 'cheerio'

const generateSubjectLine = (data) => {
  const posts = getPosts(data)
  if (posts.length > 0) {
    return `${posts[0].title} | ${posts[0].user.name}`
  }
  return `Recent activity from ${data.group_name}`
}

const getPosts = data =>
  flatten(values(pick(data, 'requests', 'offers', 'resources', 'discussions', 'projects', 'events')))

const getComments = data =>
  flatMap('comments', getPosts(data)).filter(_ => !!_) //Filter out items that are undefined (a.k.a. for Saved Search posts)

const addParamsToLinks = (text, params) => {
  if (!text) return
  const doc = cheerio.load(text, {decodeEntities: false}, false)
  const links = doc('a[href]')
  if (links.length === 0) return text
  links.each((i, el) => {
    const a = doc(el)
    const href = a.attr('href')
    if (href && href.startsWith(Frontend.Route.prefix)) {
      let newHref = href + params
      // if the original href has query params, fix the new value
      if (newHref.match(/\?/g).length > 1) {
        const i = newHref.lastIndexOf('?')
        newHref = newHref.slice(0, i) + '&' + newHref.slice(i + 1)
      }
      a.attr('href', newHref)
    }
  })
  return doc.html()
}

const filterBlockedUserData = async (userId, data) => {
  const clonedData = cloneDeep(data)
  const blockedUserIds = (await BlockedUser.blockedFor(userId)).rows.map(r => r.user_id)

  // TODO: what to do about blocked user with chats?
  const keys = ['discussions', 'requests', 'offers', 'events', 'projects', 'resources']
  for (let key of keys) {
    clonedData[key] = filter(object => !includes(get('user.id', object), blockedUserIds), clonedData[key])
  }

  return clonedData
}

const personalizeData = async (user, type, data, opts = {}) => {
  // TODO: if all content is by me, then dont send the digest
  const filteredData = await filterBlockedUserData(user.id, data)
  const clickthroughParams = '?' + qs.stringify({
    ctt: 'digest_email',
    cti: user.id,
    ctcn: data.group_name
  })

  getPosts(filteredData).forEach(post => {
    post.url = post.url + clickthroughParams
    post.reply_url = Email.postReplyAddress(post.id, user.id)
    if (post.details) {
      post.details = addParamsToLinks(post.details, clickthroughParams)
    }
  })

  getComments(filteredData).forEach(comment => {
    comment.text = addParamsToLinks(comment.text, clickthroughParams)
  })

  return Promise.props(merge(filteredData, {
    subject: generateSubjectLine(data),
    group_url: filteredData.group_url + clickthroughParams,
    recipient: {
      avatar_url: user.get('avatar_url'),
      name: user.get('name')
    },
    email_settings_url: Frontend.Route.userSettings() + clickthroughParams + '&expand=account',
    tracking_pixel_url: Analytics.pixelUrl('Digest', {
      userId: user.id,
      group: data.group_name,
      'Email Version': opts.versionName
    }),
    post_creation_action_url: Frontend.Route.emailPostForm(),
    reply_action_url: Frontend.Route.emailBatchCommentForm(),
    form_token: Email.formToken(data.group_id, user.id)
  }))
}

export default personalizeData
