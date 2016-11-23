import { cloneDeep, compact, flatten, merge, pick, values } from 'lodash'
import { flatMap, flow, map, sortBy, uniqBy } from 'lodash/fp'
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
    map(p => [p.user].concat(map('user', p.comments))),
    flatten,
    compact,
    uniqBy('id'),
    sortBy(u => u.id === user.id ? 1 : 0),
    map('name')
  )(getPosts(data))
  return `New activity from ${commaSeparate(names, 2)}`
}

const getPosts = data =>
  flatten(values(pick(data, 'requests', 'offers', 'conversations')))

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

const personalizeData = (user, data, opts = {}) => {
  const clonedData = cloneDeep(data)
  const clickthroughParams = '?' + qs.stringify({
    ctt: 'digest_email',
    cti: user.id,
    ctcn: data.community_name
  })

  getPosts(clonedData).forEach(post => {
    post.url = post.url + clickthroughParams
    post.reply_url = Email.postReplyAddress(post.id, user.id)
    if (post.details) {
      post.details = addParamsToLinks(post.details, clickthroughParams)
    }
  })

  getComments(clonedData).forEach(comment => {
    comment.text = addParamsToLinks(comment.text, clickthroughParams)
  })

  return Promise.props(merge(clonedData, {
    subject: generateSubjectLine(user, data) + (opts.subjectSuffix || ''),
    community_url: clonedData.community_url + clickthroughParams,
    recipient: {
      avatar_url: user.get('avatar_url'),
      name: user.get('name')
    },
    email_settings_url: Frontend.Route.userSettings() + clickthroughParams + '&expand=account',
    tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: user.id, community: data.community_name}),
    post_creation_action_url: Frontend.Route.emailPostForm(),
    reply_action_url: Frontend.Route.emailReplyForm(),
    form_token: Email.formToken(data.community_id, user.id)
  }))
}

export default personalizeData
