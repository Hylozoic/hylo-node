import { filter, forEach, map, uniq, isNull } from 'lodash/fp'
import insane from 'insane'
import Autolinker from 'autolinker'
import { JSDOM } from 'jsdom'
import { PathHelpers, TextHelpers, HYLO_URL_REGEX } from 'hylo-shared'

export const MAX_LINK_LENGTH = 48

export function getDOM (contentHTML) {
  return new JSDOM(contentHTML).window.document
}

// Sanitization should only occur from the backend and on output
export function sanitizeHTML (text, providedInsaneOptions) {
  if (!text) return ''

  return insane(text, TextHelpers.insaneOptions(providedInsaneOptions))
}

/*

Handles raw HTML from database:

1) Linkifies the HTML (this is necessary for legacy content),
   adding class 'hylo-link' to any internal links
2) Ensures that long link text is concatenated to `MAX_LINK_LENGTH`
3) Removes `target` attribute from all all links
4) Normalizes legacy HTML content to be consistent with current HTML format

Note: `Post#details()` and `Comment#text()` both run this by default, and it should always
      be ran against those fields.

*/
export function processHTML (contentHTML) {
  if (!contentHTML) return contentHTML

  const autolinkedHTML = Autolinker.link(contentHTML, { className: 'linkified' })
  const dom = getDOM(autolinkedHTML)

  forEach(el => {
    // Remove all `target` attributes for anchors  Concatenate long link text appending "…"
    el.removeAttribute('target')

    // Add `hylo-link` to internal links
    if ((el.getAttribute('href') && el.getAttribute('href').match(HYLO_URL_REGEX))) {
      el.className = 'hylo-link'
    }

    // This currently has to be reversed by the TipTap by referencing the href on edit
    if (el.textContent.length > MAX_LINK_LENGTH) {
      el.innerHTML = `${el.textContent.slice(0, MAX_LINK_LENGTH)}…`
    }

    // Normalize legacy Mentions
    if (
      el.getAttribute('data-entity-type') === 'mention'||
      el.getAttribute('data-user-id')
    ) {
      const newSpanElement = dom.createElement('span')

      newSpanElement.className = 'mention'
      newSpanElement.setAttribute('data-type', 'mention')
      newSpanElement.setAttribute('data-id', el.getAttribute('data-user-id'))
      newSpanElement.setAttribute('data-label', el.textContent)
      newSpanElement.innerHTML = el.innerHTML

      el.parentNode.replaceChild(newSpanElement, el)

      return
    }

    // Normalize legacy Topics
    if (
      el.getAttribute('data-entity-type') === '#mention' ||
      (!el.getAttribute('href') && el.textContent[0] === '#')
    ) {
      const newSpanElement = dom.createElement('span')

      newSpanElement.className = 'topic'
      newSpanElement.setAttribute('data-type', 'topic')
      newSpanElement.setAttribute('data-id', el.textContent?.slice(1))
      newSpanElement.setAttribute('data-label', el.textContent)
      newSpanElement.innerHTML = el.innerHTML

      el.parentNode.replaceChild(newSpanElement, el)

      return
    }
  }, dom.querySelectorAll('a'))

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
      : PathHelpers.topicPath(el.getAttribute('data-id'), groupSlug)

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
