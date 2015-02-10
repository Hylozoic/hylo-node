var request = require('request'),
  url = require('url'),
  util = require('util');

module.exports = {

  proxy: function(req, res) {
    // TODO caching

    var u = url.parse(req.url);
    u.pathname = u.pathname.replace(/\/$/, '');
    if (!u.pathname.match(/\./)) {
      u.pathname += '/index.html';
    }
    u.pathname = util.format('assets/%s%s', process.env.BUNDLE_VERSION, u.pathname);

    var newUrl = util.format('%s/%s', process.env.AWS_S3_CONTENT_URL, url.format(u));
    sails.log.info(util.format(' ↑ %s', newUrl));

    req.pipe(request(newUrl)).pipe(res);
  }

}