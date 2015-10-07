var md5 = require('md5')
var request = require('request')
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)

var generateToken = function (token, key, date, hash) {
  var secret = process.env.NEXUDUS_SECRET_KEY
  var checkString = [token, key, date].sort().join('|') + secret
  var checkHash = md5(checkString)
  if (hash !== checkHash) {
    throw new Error(format('bad hash: expected %s, got %s', hash, checkHash))
  }
  return md5(token + secret)
}

module.exports = {
  generateToken: generateToken,
  create: function (req, res) {
    var params = req.allParams()
    var authToken = generateToken(params.t, params.a, params.d, params.h)

    get({
      url: 'https://spaces.nexudus.com/api/sys/users',
      json: true,
      auth: {user: params.a, pass: authToken}
    })
    .spread((res2, body) =>
      body.Records.map(r => format('%s &lt;%s&gt;', r.FullName, r.Email)))
    .then(names => res.ok(names.join('<br/>')))
    .catch(res.serverError)
  }
}
