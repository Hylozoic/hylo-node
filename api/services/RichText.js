var Cheerio = require('cheerio')
var marked = require('marked')
var sanitizeHtml = require('sanitize-html')

export const sanitize = text => {
  if (!text) return ''

  // Remove leading &nbsp; from html. (a side-effect of contenteditable is the
  // leading &nbsp;)
  var strippedText = text.replace(/<p>&nbsp;|<p>&NBSP;/g, '<p>')

  var cleanText = sanitizeHtml(strippedText, {
    allowedTags: ['a', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em'],
    allowedAttributes: {
      a: ['href', 'data-user-id']
    },

    // Removes empty paragraphs
    exclusiveFilter: frame => frame.tag === 'p' && !frame.text.trim()
  })

  return cleanText
}

// returns a set of unique ids of any @mentions found in the text
export const getUserMentions = text => {
  if (!text) return []
  var $ = Cheerio.load(text)
  return _.uniq($('a[data-user-id]').map(function () {
    return $(this).data('user-id').toString()
  }).get())
}

export const qualifyLinks = (text, recipient, token, slug) => {
  if (!text) return text

  var $ = Cheerio.load(text)
  $('a').each(function () {
    const $this = $(this)
    const tag = $this.text().replace(/^#/, '')
    var url = $this.attr('href') || ''
    if (Tag.isValidTag(tag)) {
      if (slug) {
        url = `${Frontend.Route.prefix}/c/${slug}/tag/${tag}`
      } else {
        url = `${Frontend.Route.prefix}/tag/${tag}`
      }
    } else if (!url.match(/^https?:\/\//)) {
      url = Frontend.Route.prefix + url
      if (recipient && token) {
        url = Frontend.Route.tokenLogin(recipient, token, url)
      }
    }
    $this.attr('href', url)
  })
  return $.html()
}

export const markdown = source => {
  marked.setOptions({gfm: true, breaks: true})
  return marked(source || '')
}
