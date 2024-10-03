var md5 = require('md5')
var Nexudus = require('../services/Nexudus')

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
    var email = params.e
    var token = generateToken(params.t, params.a, params.d, params.h)

    // TODO REMOVE: this is probably trash
    Nexudus.fetchUsers(params.a, token)
      .tap(results => Email.sendRawEmail({
        email: 'robbie@hylo.com',
        data: {
          subject: format('Nexudus user records (%s) for %s', results.length, email)
        },
        extraOptions: {
          files: [{
            id: 'users.json',
            data: Buffer.from(JSON.stringify(results, null, '  ')).toString('base64')
          }]
        }}))
      .tap(results => res.ok(format('Sent %s records to Hylo.', results.length)))
      .catch(res.serverError)
  }
}
