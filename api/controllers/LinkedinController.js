var crypto = require('crypto'),
  Promise = require('bluebird'),
  request = require('request'),

  get = Promise.promisify(request.get),
  post = Promise.promisify(request.post),
  parseXml = Promise.promisify(require('xml2js').parseString),

  authUrlPrefix = 'https://www.linkedin.com/uas/oauth2/authorization',
  tokenUrlPrefix = 'https://www.linkedin.com/uas/oauth2/accessToken',
  peopleApiPrefix = 'https://api.linkedin.com/v1/people';

var generateCSRFToken = function() {
  return crypto.randomBytes(10).toString('hex');
};

var redirectUri = function() {
  return format('%s://%s%s', process.env.PROTOCOL, process.env.DOMAIN, '/noo/linkedin/provide');
};

module.exports = {

  authorize: function(req, res) {
    var token = generateCSRFToken(),
      url = format('%s?response_type=code&scope=%s&client_id=%s&state=%s&redirect_uri=%s',
        authUrlPrefix, 'r_basicprofile', process.env.LINKEDIN_API_KEY, token, redirectUri());

    req.session.linkedinAuthCSRFToken = token;
    res.writeHead(302, {Location: url});
    res.end();
  },

  provideData: function(req, res) {
    if (req.session.linkedinAuthCSRFToken != req.param('state')) {
      return res.badRequest();
    }

    var authCode = req.param('code'),
      requestTokenUrl = format(
        '%s?grant_type=authorization_code&code=%s&redirect_uri=%s&client_id=%s&client_secret=%s',
        tokenUrlPrefix, authCode, redirectUri(), process.env.LINKEDIN_API_KEY, process.env.LINKEDIN_API_SECRET);

    post(requestTokenUrl).spread(function(response, body) {
      return JSON.parse(body).access_token;
    })
    .then(function(token) {
      return get(format('%s/~:(public-profile-url)?oauth2_access_token=%s', peopleApiPrefix, token));
    })
    .spread(function(response, body) {
      return parseXml(body);
    })
    .then(function(doc) {
      return doc.person['public-profile-url'][0];
    })
    .then(function(url) {
      return res.view('popupDone', {context: 'linkedin-profile', url: url, layout: null, returnDomain: null});
    })
    .catch(function(err) {
      res.serverError(err);
    });
  }

};
