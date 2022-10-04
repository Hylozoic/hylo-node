// let Cheerio = require('cheerio')
import { filter, forEach, map, uniq, isNull } from 'lodash/fp'
import insane from 'insane'
import { JSDOM } from 'jsdom'
import linkifyHTML from 'linkify-html'
import { PathHelpers, TextHelpers } from 'hylo-shared'

export const MAX_LINK_LENGTH = 48
export const HYLO_URL_REGEX = /http[s]?:\/\/(?:www\.)?hylo\.com(.*)/gi // https://regex101.com/r/0GZMny/1
// NOTE: May still wish to use this if some legacy content proves to not have linked topics
export const HASHTAG_FULL_REGEX = /^#([A-Za-z][\w_-]+)$/


export function getDOM (contentHTML) {
  const jsdom = new JSDOM(contentHTML)

  return jsdom.window.document
}

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

  const linkfiedHTML = linkifyHTML(contentHTML)
  const dom = getDOM(linkfiedHTML)

  // Make Hylo `anchors` relative links with `target='_self'`, otherwise `target=_blank` unless forEmail
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
    let href = el.className === 'mention'
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
      el.setAttribute('data-id', el.getAttribute('data-user-id'))
      href = PathHelpers.mentionPath(el.getAttribute('data-user-id'), groupSlug)
    } else {
      el.className = 'topic'
      el.setAttribute('data-label', el.getAttribute('data-search'))
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

// For email use exclusively:
export function qualifyLinks (processedHTML) {
  const dom = getDOM(processedHTML)

  forEach(el => {
    const href = el.getAttribute('href')
    if (href && !href.match(/^https?:\/\//)) {
      el.setAttribute('href', Frontend.Route.prefix + href)
    }
  }, dom.querySelectorAll('a'))

  return dom.querySelector('body').innerHTML
}

/*
Returns a set of unique IDs for any mention members
found in the provided HTML

Used for generating notifications
*/
export function getUserMentions (processedHTML) {
  if (!processedHTML) return []
  
  const dom = getDOM(processedHTML)
  const mentionElements = dom.querySelectorAll('.mention')
  const mentionedUserIDs = map(el => el.getAttribute('data-id'), mentionElements)
  
  return filter(el => !isNull(el), uniq(mentionedUserIDs))
}
