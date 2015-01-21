var Cheerio = require('cheerio'),
  sanitizeHtml = require('sanitize-html');

var sanitize = function(text) {
  if (!text) return '';

  // Remove leading &nbsp; from html. (a side-effect of contenteditable is the leading &nbsp;)
  var strippedText = text.replace(/<p>&nbsp;|<p>&NBSP;/g, "<p>");

  var cleanText = sanitizeHtml(strippedText, {
    allowedTags: [ 'a', 'p' ],
    allowedAttributes: {
      'a': [ 'href', 'data-user-id' ]
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
var getMentions = function(text) {
  var $ = Cheerio.load(text);
  return _.uniq($("a[data-user-id]").map(function(i, elem) {
    return $(this).data("user-id");
  }).get());
};

module.exports = {
  sanitize: sanitize,
  getUserMentions: getMentions
};