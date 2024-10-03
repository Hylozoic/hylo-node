import { cloneDeep, flatten, merge, pick, values } from 'lodash'
import { flatMap, includes, filter, get } from 'lodash/fp'
import { es } from '../../i18n/es'
import { en } from '../../i18n/en'
import * as cheerio from 'cheerio'
const locales = { en, es }

const generateSubjectLine = (data, locale) => {
  const posts = getPosts(data)

  if (data.search) {
    // Saved search
    return locales[locale].newSavedSearchResults(data.search.get('name'))
  }

  if (posts.length > 0) {
    return `${posts[0].title} | ${posts[0].user.name}`
  }
  return locales[locale].recentActivityFrom(data.group_name)
}

const getPosts = data =>
  flatten(values(pick(data, 'requests', 'offers', 'resources', 'discussions', 'projects', 'events')))

const getComments = data =>
  flatMap('comments', getPosts(data)).filter(_ => !!_) // Filter out items that are undefined (a.k.a. for Saved Search posts)

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
  for (const key of keys) {
    clonedData[key] = filter(object => !includes(get('user.id', object), blockedUserIds), clonedData[key])
  }

  return clonedData
}

const personalizeData = async (user, type, data, opts = {}) => {
  // TODO: if all content is by me, then dont send the digest
  const filteredData = await filterBlockedUserData(user.id, data)
  const locale = user.get('settings').locale || 'en'
  const clickthroughParams = '?' + new URLSearchParams({
    ctt: 'digest_email',
    cti: user.id,
    ctcn: data.group_name
  }).toString()

  getPosts(filteredData).forEach(post => {
    console.log('post', post, 'aaadsds')
    post.url = post.url + clickthroughParams
    post.reply_url = Email.postReplyAddress(post.id, user.id)
    if (post.details) {
      post.details = addParamsToLinks(post.details, clickthroughParams)
    }
  })

  getComments(filteredData).forEach(comment => {
    comment.text = addParamsToLinks(comment.text, clickthroughParams)
  })

  const loginToken = user.generateJWT({
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // 1 month expiration
    action: 'notification_settings' // To track that this token can only be used for changing notification settings
  })

  return Promise.props(merge(filteredData, {
    subject: generateSubjectLine(data, locale),
    group_url: filteredData.group_url + clickthroughParams,
    recipient: {
      avatar_url: user.get('avatar_url'),
      name: user.get('name')
    },
    loginToken,
    email_settings_url: Frontend.Route.notificationsSettings() + clickthroughParams + '&expand=account' + '&token=' + loginToken + '&name=' + encodeURIComponent(user.get('name')) + '&u=' + user.id,
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
