const LRU = require('lru-cache')
const mime = require('mime')
const request = require('request')
const streamifier = require('streamifier')
const url = require('url')
const cache = LRU(50)

const staticPages = [
  '',
  '/help',
  '/help/markdown',
  '/about',
  '/about/careers',
  '/about/contact',
  '/about/team',
  '/subscribe',
  '/styleguide',
  '/terms',
  '/terms/privacy'
]

const transformPathname = pathname => {
  // remove trailing slash
  pathname = pathname.replace(/\/$/, '')

  // a path without an extension should be served by index.html in
  // the folder of the same name.
  if (!pathname.match(/\.\w{2,4}$/)) {
    if (pathname.startsWith('/admin')) {
      // serve the admin Angular app
      pathname = '/admin'
    } else if (!_.some(staticPages, x => x === pathname)) {
      // for any paths not explicitly listed, serve the Angular app.
      pathname = '/app'
    }

    pathname += '/index.html'
  }

  // add the deploy-specific (cache-busting) path prefix
  if (!pathname.startsWith('/assets')) {
    pathname = `/assets/${process.env.BUNDLE_VERSION}${pathname}`
  }

  return pathname
}

module.exports = {
  proxy: function (req, res) {
    if (process.env.DISABLE_PROXY) {
      return res.status(503).send('Service Unavailable')
    }

    var u = url.parse(req.url)
    u.pathname = transformPathname(u.pathname)
    var newUrl = process.env.ASSET_HOST_URL.replace(/\/$/, '') + url.format(u)

    // use path without query params as cache key
    const cacheKey = (sails.config.environment === 'development' ? null : u.pathname)
    const cachedValue = (cacheKey ? cache.get(cacheKey) : null)

    if (cachedValue) {
      sails.log.info(` ☺ ${newUrl}`)
      var mimeType = mime.lookup(u.pathname)

      res.set('Content-Type', mimeType)
      streamifier.createReadStream(cachedValue).pipe(res)
    } else {
      sails.log.info(` ↑ ${newUrl}`)
      var chunks = []

      request.get(newUrl)
      .on('response', upstreamRes => {
        upstreamRes.on('data', d => chunks.push(d))
        upstreamRes.on('end', () => cacheKey && cache.set(cacheKey, Buffer.concat(chunks)))
      })
      .on('error', err => res.serverError(err.message))
      .pipe(res)
    }
  }
}
