var Cheerio = require('cheerio'),
  marked = require('marked'),
  sanitizeHtml = require('sanitize-html');

var sanitize = function(text) {
  if (!text) return '';

  // Remove leading &nbsp; from html. (a side-effect of contenteditable is the leading &nbsp;)
  var strippedText = text.replace(/<p>&nbsp;|<p>&NBSP;/g, "<p>");

  var cleanText = sanitizeHtml(strippedText, {
    allowedTags: ['a', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em'],
    allowedAttributes: {
      'a': ['href', 'data-user-id']
    },

    // Removes empty paragraphs
    exclusiveFilter: function(frame) {
      return frame.tag === 'p' && !frame.text.trim();
    }
  });

  return cleanText;
};

/**
 * @returns a set of unique ids of any @mentions found in the text
 */
var getUserMentions = function(text) {
  var $ = Cheerio.load(text);
  return _.uniq($("a[data-user-id]").map(function () {
    return $(this).data("user-id").toString()  
  }).get());
};

var qualifyLinks = function(text, recipient, token) {
  var $ = Cheerio.load(text);
  $('[data-user-id]').each(function() {
    var $this = $(this),
      url = Frontend.Route.profile({id: $this.data('user-id')});
    if (recipient && token) {
      url = Frontend.Route.tokenLogin(recipient, token, url);
    }
    $this.attr('href', url);
  });
  return $.html();
};

var markdown = function(source) {
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  return marked(source || '');
};

module.exports = {
  getUserMentions: getUserMentions,
  qualifyLinks:    qualifyLinks,
  sanitize:        sanitize,
  markdown:        markdown
};
