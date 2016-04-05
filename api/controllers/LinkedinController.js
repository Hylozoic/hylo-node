const crypto = require('crypto')
const Promise = require('bluebird')
const request = require('request')
const get = Promise.promisify(request.get)
const post = Promise.promisify(request.post)
const parseXml = Promise.promisify(require('xml2js').parseString)
const authUrlPrefix = 'https://www.linkedin.com/uas/oauth2/authorization'
const tokenUrlPrefix = 'https://www.linkedin.com/uas/oauth2/accessToken'
const peopleApiPrefix = 'https://api.linkedin.com/v1/people'

const generateCSRFToken = () =>
  crypto.randomBytes(10).toString('hex')

const redirectUri = () =>
  `${process.env.PROTOCOL}://${process.env.DOMAIN}/noo/linkedin/provide`

module.exports = {
  authorize: function (req, res) {
    const token = generateCSRFToken()
    const url = format('%s?response_type=code&scope=%s&client_id=%s&state=%s&redirect_uri=%s',
      authUrlPrefix, 'r_basicprofile', process.env.LINKEDIN_API_KEY, token, redirectUri())

    req.session.linkedinAuthCSRFToken = token
    res.writeHead(302, {Location: url})
    res.end()
  },

  provideData: function (req, res) {
    if (req.session.linkedinAuthCSRFToken !== req.param('state')) {
      return res.badRequest()
    }

    const authCode = req.param('code')
    const requestTokenUrl = format(
      '%s?grant_type=authorization_code&code=%s&redirect_uri=%s&client_id=%s&client_secret=%s',
      tokenUrlPrefix, authCode, redirectUri(), process.env.LINKEDIN_API_KEY, process.env.LINKEDIN_API_SECRET)

    post(requestTokenUrl)
    .spread((response, body) => JSON.parse(body).access_token)
    .then(token => get(`${peopleApiPrefix}/~:(public-profile-url)?oauth2_access_token=${token}`))
    .spread((response, body) => parseXml(body))
    .then(doc => _.get(doc, 'person.public-profile-url.0'))
    .then(url => res.view('popupDone', {
      context: 'linkedin-profile',
      url: url,
      layout: null,
      returnDomain: null
    }))
    .catch(res.serverError)
  }

}
