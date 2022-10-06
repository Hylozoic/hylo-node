import { filter, forEach, map, uniq, isNull } from 'lodash/fp'
import insane from 'insane'
import { JSDOM } from 'jsdom'
import decode from 'ent/decode'
import linkifyHTML from 'linkify-html'
import { PathHelpers, TextHelpers } from 'hylo-shared'

export const MAX_LINK_LENGTH = 48

/*
  Note: Very old legacy content (older than 3-5 years) relied upon topic "#" references being 
  "Linkified" automatically. Currently our editors don't assume the text "#whatever-topic"
  should be automatically linked, relying upon the explicit topic picking within the editor.
  
  Keeping this note and regex as as a reminder if this proves an issue for any reason in the
  future.
*/
export const HASHTAG_FULL_REGEX = /^#([A-Za-z][\w_-]+)$/

export function getDOM (contentHTML) {
  const jsdom = new JSDOM(contentHTML)

  return jsdom.window.document
}

// Sanitization should only occur from the backend and on output
export function sanitizeHTML (text, providedInsaneOptions) {
  if (!text) return ''

  const options = TextHelpers.insaneOptions(providedInsaneOptions)

  // remove leading &nbsp; (a side-effect of contenteditable)
  const strippedText = text.replace(/<p>&nbsp;/gi, '<p>')

  return insane(strippedText, options)
}

/*

Handles raw HTML from database:

1) Ensures that long link text is concatenated
2) Aligns legacy HTML content to deliver a result consistent to current HTML format

Note: `Post#details()` and `Comment#text()` both run this by default, and it should always
      be ran against those fields.

*/
export function processHTML (contentHTML) {
  if (!contentHTML) return contentHTML

  const linkifiedHTML = linkifyHTML(decode(contentHTML), { target: { url: null } })
  const dom = getDOM(linkifiedHTML)

  // Concatenate long link text appending "…"
  // This currently has to be reversed by the TipTap by referencing the href on edit
  forEach(el => {
    if (el.getAttribute('href')) {
      if (el.textContent.length > MAX_LINK_LENGTH) {
        el.innerHTML = `${el.textContent.slice(0, MAX_LINK_LENGTH)}…`
      }
    }
  }, dom.querySelectorAll('a'))

  // Normalize legacy Mention and Topic `anchors`
  const convertLegacyAnchors = forEach(el => {
    const newSpanElement = dom.createElement('span')

    if (el.getAttribute('data-entity-type') === 'mention') {
      newSpanElement.className = 'mention'
      newSpanElement.setAttribute('data-id', el.getAttribute('data-user-id'))
    } else {
      newSpanElement.className = 'topic'
      if (el.getAttribute('data-id')) {
        newSpanElement.setAttribute('data-id', el.getAttribute('data-id'))
      }
      newSpanElement.setAttribute('data-label', el.getAttribute('data-search') || el.textContent?.slice(1))
    }

    newSpanElement.innerHTML = el.innerHTML
    el.parentNode.replaceChild(newSpanElement, el)
  })
  convertLegacyAnchors(dom.querySelectorAll(
    'a[data-entity-type="#mention"], a[data-entity-type="mention"], a[data-user-id], a.hashtag'
  ))

  return dom.querySelector('body').innerHTML
}

/*

Prepares content for HTML Email delivery

- Always make sure `processHTML` was ran first, this is done
  in `Post#details()` and `Comment#text()`

- This same logic is handled dynamcially on Web in `ClickCatcher`,
  and on Mobile in the `HyloHTML` component.

*/
export function qualifyLinks (processedHTML) {
  const dom = getDOM(processedHTML)

  // Convert Mention and Topic `span` elements to `a` elements
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

    el.parentNode.replaceChild(anchorElement, el)
  })
  convertSpansToAnchors(dom.querySelectorAll(
    'span.topic, span.mention'
  ))

  forEach(el => {
    const href = el.getAttribute('href')
    if (href && !href.match(/^(https?|email):/)) {
      el.setAttribute('href', Frontend.Route.prefix + href)
    }
  }, dom.querySelectorAll('a'))

  return dom.querySelector('body').innerHTML
}

/*

Returns a unique set of IDs for any members "mentioned"
in the provided HTML. Used for generating notifications.

*/
export function getUserMentions (processedHTML) {
  if (!processedHTML) return []
  
  const dom = getDOM(processedHTML)
  const mentionElements = dom.querySelectorAll('.mention')
  const mentionedUserIDs = map(el => el.getAttribute('data-id'), mentionElements)
  
  return filter(el => !isNull(el), uniq(mentionedUserIDs))
}
