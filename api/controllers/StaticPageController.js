var LRU = require('lru-cache'),
  mime = require('mime'),
  request = require('request'),
  streamifier = require('streamifier'),
  url = require('url'),
  util = require('util'),
  cache = LRU(50),
  equals = function(b) {
    return function(a) {
      return a == b;
    };
  },
  staticPages = [
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
  ];

module.exports = {

  proxy: function(req, res) {
    if (process.env.DISABLE_PROXY) {
      return res.status(503).send('Service Unavailable');
    }

    var u = url.parse(req.url);

    // remove trailing slash
    u.pathname = u.pathname.replace(/\/$/, '');

    // a path without an extension should be served by index.html in
    // the folder of the same name.
    if (!u.pathname.match(/\.\w{2,4}$/)) {

      if (u.pathname.startsWith('/admin')) {
        // serve the admin Angular app
        u.pathname = '/admin';
      } else if (!_.some(staticPages, equals(u.pathname))) {
        // for any paths not explicitly listed, serve the Angular app.
        u.pathname = '/app';
      }

      u.pathname += '/index.html';
    }

    if (!u.pathname.startsWith('/assets')) {
      // add the deploy-specific (cache-busting) path prefix
      u.pathname = util.format('/assets/%s%s', process.env.BUNDLE_VERSION, u.pathname);
    }

    var newUrl = util.format('%s%s', process.env.ASSET_HOST_URL.replace(/\/$/, ''), url.format(u));

    // use path without query params as cache key
    var cacheKey = (sails.config.environment === 'development' ? null : u.pathname),
      cached = (cacheKey ? cache.get(cacheKey) : null);

    if (cached) {
      sails.log.info(util.format(' ☺ %s', newUrl));
      var mimeType = mime.lookup(u.pathname),
        isText = _.includes(['application/javascript', 'text/html', 'text/css', 'text/plain'], mimeType);

      res.set('Content-Type', mimeType);
      streamifier.createReadStream(cached).pipe(res);
    } else {
      sails.log.info(util.format(' ↑ %s', newUrl));

      var chunks = [];

      request.get(newUrl)
      .on('response', upstreamRes => {
        upstreamRes.on('data', d => chunks.push(d));
        upstreamRes.on('end', () => (cacheKey ? cache.set(cacheKey, Buffer.concat(chunks)) : null));
      })
      .pipe(res);
    }
  }

};
