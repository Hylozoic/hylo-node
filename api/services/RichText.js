var Cheerio = require('cheerio')
import { PathHelpers, TextHelpers } from 'hylo-shared'

/*
For email use exclusively:

Canonically relying on the output of HyloShared TextHelpers.presentHTML
this function further transforms anchor element `href`s to fully qualified
Hylo URLs. Adds token links for all other relative/apparently Hylo `href`s
*/
export const qualifyLinks = (html, recipient, token, slug) => {
  if (!html) return html

  const presentedHTML = TextHelpers.processHTML(html, { slug }) 
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
