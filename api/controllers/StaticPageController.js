var LRU = require('lru-cache'),
  request = require('request'),
  url = require('url'),
  util = require('util');

var cache = LRU(10);

var appPathPrefixes = [
  /^\/c\//,
  /^\/h\//,
  /^\/u\//,
  /^\/settings/,
  /^\/edit-profile/,
  /^\/create\/community/
];

module.exports = {

  proxy: function(req, res) {
    if (process.env.DISABLE_PROXY) return res.ok('');

    var u = url.parse(req.url);

    // remove trailing slash
    u.pathname = u.pathname.replace(/\/$/, '');

    // for Angular app requests, serve the base file.
    if (_.any(appPathPrefixes, function(r) { return u.pathname.match(r); })) {
      u.pathname = '/app';
    }

    // a path without an extension should be served by index.html in
    // the folder of the same name.
    if (!u.pathname.match(/\./)) {
      u.pathname += '/index.html';
    }

    // add the deploy-specific (cache-busting) path prefix
    u.pathname = util.format('assets/%s%s', process.env.BUNDLE_VERSION, u.pathname);

    var newUrl = util.format('%s/%s', process.env.AWS_S3_CONTENT_URL, url.format(u));

    // use path without query params as cache key
    var cacheKey = u.pathname,
      cached = cache.get(cacheKey);

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