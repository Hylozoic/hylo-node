var striptags = require('striptags')
var truncate = require('html-truncate')

module.exports = (req, res, next) => {
  var url = require('url').parse(req.url, true)
  if (!isBot(url, req.headers['user-agent'])) return next()
  matchingProject(url)
  .then(project => project && renderProject(project, res))
  .then(done => done || matchingPost(url).then(post => post && renderPost(post, res)))
  .then(done => done || next())
}

var isBot = function (url, userAgent) {
  if (!userAgent) return false
  if (_.has(url.query, '_escaped_fragment_')) return true

  userAgent = userAgent.toLowerCase()
  return crawlerUserAgents.some(u => userAgent.includes(u))
}

var crawlerUserAgents = [
  'facebookexternalhit',
  'slackbot',
  'twitterbot'
]

var defaultImage = {
  url: 'https://www.hylo.com/img/smallh.png',
  width: 144,
  height: 144
}

var matchingProject = Promise.method(url => {
  var match = url.pathname.match(projectPathPattern)
  if (!match) return
  return Project.find(match[1], {withRelated: 'media'}).then(project => project && project.isPublic() && project)
})

var matchingPost = Promise.method(url => {
  var match = url.pathname.match(postPathPattern)
  if (!match) return
  return Post.find(match[1], {withRelated: 'media'}).then(post => post && post.isPublic() && post)
})

var renderProject = function (project, res) {
  var attrs = {
    title: project.get('title'),
    description: project.get('intention')
  }

  var models = project.relations.media.models
  var image = _.find(models || [], m => m.get('type') === 'image')
  var video = _.find(models || [], m => m.get('type') === 'video')

  if (image) {
    attrs.image = image.get('url')
    attrs.width = image.get('width')
    attrs.height = image.get('height')
  } else if (video) {
    attrs.image = video.get('thumbnail_url')
    attrs.width = video.get('width')
    attrs.height = video.get('height')
  } else {
    attrs.image = defaultImage.url
    attrs.width = defaultImage.width
    attrs.height = defaultImage.height
  }

  res.render('openGraphTags', attrs)
  return true
}

var renderPost = function (post, res) {
  var attrs = {
    title: post.get('name'),
    description: truncate(striptags(post.get('description') || ''), 140)
  }

  var models = post.relations.media.models
  var image = _.find(models || [], m => m.get('type') === 'image')

  if (image) {
    attrs.image = image.get('url')
    attrs.width = image.get('width')
    attrs.height = image.get('height')
  } else {
    attrs.image = defaultImage.url
    attrs.width = defaultImage.width
    attrs.height = defaultImage.height
  }

  res.render('openGraphTags', attrs)
  return true
}

var projectPathPattern = new RegExp('^/project/([^/]+)')
var postPathPattern = new RegExp('^/p/([^/]+)')
