var striptags = require('striptags')
var truncate = require('html-truncate')

module.exports = (req, res, next) => {
  var url = require('url').parse(req.url, true)
  var fullUrl = req.baseUrl + req.originalUrl
  if (!isBot(url, req.headers['user-agent'])) return next()
  matchingProject(url)
    .then(project => project && renderProject(project, fullUrl, res))
    .then(done => done || matchingPost(url).then(post => post && renderPost(post, fullUrl, res)))
    .then(done => done || next())
}

var isBot = function (url, userAgent) {
  if (!userAgent) return false
  if (_.has(url.query, '_escaped_fragment_')) return true

  userAgent = userAgent.toLowerCase()
  return crawlerUserAgents.some(u => userAgent.contains(u))
}

var crawlerUserAgents = [
  'facebookexternalhit',
  'slackbot',
  'twitterbot'
]

var matchingProject = Promise.method(url => {
  var match = url.pathname.match(projectPathPattern)
  if (!match) return
  return Project.find(match[1]).then(project => project && project.isPublic() && project)
})

var matchingPost = Promise.method(url => {
  var match = url.pathname.match(postPathPattern)
  if (!match) return
  return Post.find(match[1], {withRelated: 'media'}).then(post => post && post.isPublic() && post)
})

var renderProject = function (project, url, res) {
  res.render('openGraphTags', {
    title: project.get('title'),
    description: project.get('intention'),
    image: project.get('image_url') || project.get('thumbnail_url'),
    url: url
  })
  return true
}

var renderPost = function (post, url, res) {
  var models = post.relations.media.models
  var image = _.find(models || [], m => m.get('type') === 'image')
  res.render('openGraphTags', {
    title: post.get('name'),
    description: truncate(striptags(post.get('description') || ''), 140),
    image: image ? image.get('url') : '',
    url: url
  })
  return true
}

var projectPathPattern = new RegExp('^/project/([^/]+)')
var postPathPattern = new RegExp('^/p/([^/]+)')
