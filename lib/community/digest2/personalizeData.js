import { cloneDeep, compact, flatten, merge, pick, values } from 'lodash'
import { flatMap, flow, map, sortBy, uniqBy, includes, filter, get } from 'lodash/fp'
import qs from 'querystring'
import cheerio from 'cheerio'

const commaSeparate = (items, max) => {
  const length = items.length
  switch (length) {
    case 0: return ''
    case 1: return items[0]
    case 2: return `${items[0]} and ${items[1]}`
    default:
      return `${items[0]}, ${items[1]}, and ${length - 2} other${length > 3 ? 's' : ''}`
  }
}

const generateSubjectLine = (user, data) => {
  const names = flow(
    map(p => p.user),
    compact,
    uniqBy('id'),
    sortBy(u => u.id === user.id ? 1 : 0),
    map('name')
  )(getPosts(data))
  return `New activity from ${commaSeparate(names, 2)}`
}

const getPosts = data =>
  flatten(values(pick(data, 'requests', 'offers', 'conversations', 'projects', 'events')))

const getComments = data =>
  flatMap('comments', getPosts(data))

const addParamsToLinks = (text, params) => {
  if (!text) return
  const doc = cheerio.load(text, {decodeEntities: false})
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
  
  const keys = ['conversations', 'requests', 'offers', 'events', 'projects']
  for (let key of keys) {
    clonedData[key] = filter(object => !includes(get('user.id', object), blockedUserIds), clonedData[key])
  }

  return clonedData
}

const personalizeData = async (user, data, opts = {}) => {
  const filteredData = await filterBlockedUserData(user.id, data)
  const clickthroughParams = '?' + qs.stringify({
    ctt: 'digest_email',
    cti: user.id,
    ctcn: data.community_name
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
    subject: generateSubjectLine(user, data) + (opts.subjectSuffix || ''),
    community_url: filteredData.community_url + clickthroughParams,
    recipient: {
      avatar_url: user.get('avatar_url'),
      name: user.get('name')
    },
    email_settings_url: Frontend.Route.userSettings() + clickthroughParams + '&expand=account',
    tracking_pixel_url: Analytics.pixelUrl('Digest', {
      userId: user.id,
      community: data.community_name,
      'Email Version': opts.versionName
    }),
    post_creation_action_url: Frontend.Route.emailPostForm(),
    reply_action_url: Frontend.Route.emailBatchCommentForm(),
    form_token: Email.formToken(data.community_id, user.id)
  }))
}

export default personalizeData
