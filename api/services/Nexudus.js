var request = require('request')
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)

const apiHost = 'https://spaces.nexudus.com/api'
const pageSize = 500

var consumePage = function (num, username, password) {
  return get({
    url: format('%s/sys/users?size=%s&page=%s', apiHost, pageSize, num),
    json: true,
    auth: {user: username, pass: password}
  })
  .spread((res2, body) => {
    if (res2.statusCode !== 200) {
      throw new Error(res2.statusCode)
    }

    if (body.CurrentPage < body.TotalPages) {
      return body.Records.concat(consumePage(num + 1, username, password))
    } else {
      return body.Records
    }
  })
}

module.exports = {
  fetchUsers: function (username, password) {
    var self = this
    return consumePage(1, username, password)
    .then(records => records.map(self.formatRecord))
  },

  formatRecord: record => ({
    name: record.FullName,
    email: record.Email,
    created_at: record.CreatedOn,
    updated_at: record.UpdatedOn
  })

}
