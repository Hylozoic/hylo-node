let Cheerio = require('cheerio')
import forEach from 'lodash/fp/forEach'
import insane from 'insane'
import { JSDOM } from 'jsdom'
import linkifyHTML from 'linkify-html'
import { PathHelpers, TextHelpers } from 'hylo-shared'

export const MAX_LINK_LENGTH = 48
export const HYLO_URL_REGEX = /http[s]?:\/\/(?:www\.)?hylo\.com(.*)/gi // https://regex101.com/r/0GZMny/1
// NOTE: May still wish to use this if some legacy content proves to not have linked topics
export const HASHTAG_FULL_REGEX = /^#([A-Za-z][\w_-]+)$/


// Sanitization should only occur on the backend
export function sanitizeHTML (text, providedInsaneOptions) {
  if (!text) return ''

  const options = TextHelpers.insaneOptions(providedInsaneOptions)

  // remove leading &nbsp; (a side-effect of contenteditable)
  const strippedText = text.replace(/<p>&nbsp;/gi, '<p>')

  return insane(strippedText, options)
}

export function processHTML (contentHTML, groupSlug) {
  if (!contentHTML) return contentHTML

  const linkfiiedHTML = linkifyHTML(contentHTML)
  const jsdom = new JSDOM(linkfiiedHTML)
  const dom = jsdom.window.document

  // Make Hylo `anchors` relative links with `target='_self'`, otherwise `target=_blank`
  forEach(el => {
    if (el.getAttribute('href')) {
      if (el.textContent.length > MAX_LINK_LENGTH) {
        el.innerHTML = `${el.textContent.slice(0, MAX_LINK_LENGTH)}…`
      }

      const hyloLinksMatch = el.getAttribute('href').matchAll(HYLO_URL_REGEX).next()

      if (hyloLinksMatch?.value && hyloLinksMatch?.value?.length === 2) {
        const relativeURLPath = hyloLinksMatch.value[1] === '' ? '/' : hyloLinksMatch.value[1]

        el.setAttribute('target', '_self')
        el.setAttribute('href', relativeURLPath)
      } else {
        el.setAttribute('target', '_blank')
      }
    }
  }, dom.querySelectorAll('a'))

  // Convert Mention and Topic `spans` to `anchors`
  const convertSpansToAnchors = forEach(el => {
    const anchorElement = dom.createElement('a')
    const href = el.className === 'mention'
      ? PathHelpers.mentionPath(el.getAttribute('data-id'), groupSlug)
      : PathHelpers.topicPath(el.getAttribute('data-label'), groupSlug)

    for (const attr of el.attributes) {
      anchorElement.setAttribute(attr.name, attr.value)
    }

    anchorElement.innerHTML = el.innerHTML
    anchorElement.setAttribute('href', href)
    anchorElement.setAttribute('target', '_self')

    el.parentNode.replaceChild(anchorElement, el)
  })
  convertSpansToAnchors(dom.querySelectorAll(
    'span.topic, span.mention'
  ))

  // Normalize legacy Mention and Topic `anchors`
  const convertLegacyAnchors = forEach(el => {
    let href

    if (el.getAttribute('data-entity-type') === 'mention') {
      el.className = 'mention'
      href = PathHelpers.mentionPath(el.getAttribute('data-user-id'), groupSlug)
    } else {
      el.className = 'topic'
      href = PathHelpers.topicPath(el.getAttribute('data-search') || el.textContent?.slice(1), groupSlug)
    }

    el.setAttribute('href', href)
    el.setAttribute('target', '_self')
  })
  convertLegacyAnchors(dom.querySelectorAll(
    'a[data-entity-type="#mention"], a[data-entity-type="mention"], a[data-user-id], a.hashtag'
  ))

  return dom.querySelector('body').innerHTML
}

/*
For email use exclusively:

Canonically relying on the output of `processHTML`
this function further transforms anchor element `href`s to fully qualified
Hylo URLs. Adds token links for all other relative/apparently Hylo `href`s
*/
export const qualifyLinks = (html, recipient, token, slug) => {
  if (!html) return html

  const presentedHTML = processHTML(html, { slug }) 
  const $ = Cheerio.load(presentedHTML, null, false)

  $('a').each(function () {
    const $el = $(this)
    let url = $el.attr('href') || ''

    if ($el.attr('data-user-id')) {
      const userId = $el.attr('data-user-id')
      url = `${Frontend.Route.prefix}${PathHelpers.mentionPath(userId, slug)}`
    } else if ($el.attr('data-search')) {
      const topic = $el.attr('data-search').replace(/^#/, '')
      url = `${Frontend.Route.prefix}${PathHelpers.topicPath(topic, slug)}`
    } else if (!url.match(/^https?:\/\//)) {
      url = Frontend.Route.prefix + url
      if (recipient && token) {
        url = Frontend.Route.tokenLogin(recipient, token, url)
      }
    }

    $el.attr('href', url)
  })

  return $.html()
}

/*
Returns a set of unique IDs for any mention members
found in the provided HTML

Used for generating notifications
*/
export const getUserMentions = html => {
  if (!html) return []

  let $ = Cheerio.load(html)

  return _.uniq($('a[data-user-id]').map(function () {
    return $(this).attr('data-user-id').toString()
  }).get())
}

// export function getDom (contentHTML) {
//   // Node
//   if (typeof window === 'undefined') {
//     const { JSDOM } = require('jsdom')
//     const jsdom = new JSDOM(contentHTML)
//     return jsdom.window.document
//   // // React Native
//   // } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
//   //   const DomParser = require('react-native-html-parser').DOMParser
//   //   return new DomParser().parseFromString(contentHTML,'text/html')
//   // Browser
//   } else {
//     const parser = new window.DOMParser()
//     return parser.parseFromString(contentHTML, 'text/html')
//   }
// }