var md5 = require('md5')
var request = require('request')
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)

const apiHost = 'https://spaces.nexudus.com/api'
const pageSize = 500

var generateToken = function (token, key, date, hash) {
  var secret = process.env.NEXUDUS_SECRET_KEY
  var checkString = [token, key, date].sort().join('|') + secret
  var checkHash = md5(checkString)
  if (hash !== checkHash) {
    throw new Error(format('bad hash: expected %s, got %s', hash, checkHash))
  }
  return md5(token + secret)
}

var formatRecord = r => ({
  name: r.FullName,
  email: r.Email,
  created_at: r.CreatedOn,
  updated_at: r.UpdatedOn
})

module.exports = {
  generateToken: generateToken,
  create: function (req, res) {
    var params = req.allParams()
    var email = params.e
    var token = generateToken(params.t, params.a, params.d, params.h)
    var results = []

    var consumePage = function (num) {
      return get({
        url: format('%s/sys/users?size=%s&page=%s', apiHost, pageSize, num),
        json: true,
        auth: {user: params.a, pass: token}
      })
      .spread((res2, body) => {
        body.Records.forEach(r => results.push(formatRecord(r)))
        if (body.CurrentPage < body.TotalPages) return consumePage(num + 1)
      })
    }

    consumePage(1)
    .then(() => Email.sendRawEmail('lawrence@hylo.com', {
      subject: format('Nexudus user records (%s) for %s', results.length, email)
    }, {
      files: [{
        id: 'users.json',
        data: new Buffer(JSON.stringify(results, null, '  ')).toString('base64')
      }]
    }))
    .then(() => res.ok(format('Sent %s records to Hylo.', results.length)))
    .catch(res.serverError)
  }
}
