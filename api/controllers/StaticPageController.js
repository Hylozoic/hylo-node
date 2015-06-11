var LRU = require('lru-cache'),
  request = require('request'),
  url = require('url'),
  util = require('util'),
  cache = LRU(10),
  equals = function(b) {
    return function(a) {
      return a == b;
    };
  },
  staticPages = [
    '',
    '/faq',
    '/about',
    '/about/careers',
    '/about/contact',
    '/about/team',
    '/admin',
    '/styleguide'
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
    if (!u.pathname.match(/\.\w{3,4}$/)) {

      // for any paths not explicitly listed, serve the Angular app.
      if (!_.any(staticPages, equals(u.pathname))) {
        u.pathname = '/app';
      }

      u.pathname += '/index.html';
    }

    // add the deploy-specific (cache-busting) path prefix
    u.pathname = util.format('assets/%s%s', process.env.BUNDLE_VERSION, u.pathname);

    var newUrl = util.format('%s/%s', process.env.ASSET_HOST_URL, url.format(u));

    // use path without query params as cache key
    var cacheKey = u.pathname,
      cached = (sails.config.environment === 'development' ? null : cache.get(cacheKey));

    if (cached) {
      sails.log.info(util.format(' ☺ %s', newUrl));
      res.ok(cached);
    } else {
      sails.log.info(util.format(' ↑ %s', newUrl));
      request(newUrl, function(err, response, body) {
        if (response && response.statusCode == 403) {
          // a 403 from S3 could also be a 404
          return res.notFound();
        }

        if (err || response.statusCode != 200) {
          var code = (response ? response.statusCode : 'X');
          return res.serverError(util.format("upstream: %s %s", code, err));
        }

        cache.set(cacheKey, body);
        res.ok(body);
      })
    }
  }

}