var request = require('request')
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)

const apiHost = 'https://spaces.nexudus.com/api'
const pageSize = 500

var API = function (username, password) {
  this.username = username
  this.password = password
}

API.prototype.getRecords = function (path, query) {
  var self = this
  var getPage = function (pageNum) {
    var url = format('%s/%s', apiHost, path)
    console.log(url)
    return get({
      url: url,
      json: true,
      auth: {user: self.username, pass: self.password},
      qs: _.merge({
        size: pageSize,
        page: pageNum
      }, query)
    })
    .spread((res2, body) => {
      if (res2.statusCode !== 200) {
        throw new Error(res2.statusCode)
      }

      if (body.CurrentPage < body.TotalPages) {
        return body.Records.concat(getPage(pageNum + 1))
      } else {
        return body.Records
      }
    })
  }

  return getPage(1)
}

module.exports = {
  // members are users who are active and have an active contract
  fetchMembers: function (username, password) {
    var self = this
    var api = new API(username, password)
    var r1, r2
    return api.getRecords('billing/coworkercontracts', {CoworkerContract_Active: true})
    .then(records => {
      console.log(format('got %s coworker contracts', records.length))
      r1 = records
      var coworkerIds = records.map(r => r.CoworkerId)
      return api.getRecords('spaces/coworkers', {Coworker_Active: true})
      .tap(records => {
        console.log(format('got %s coworkers', records.length))
        r2 = records
      })
      .then(records => records
        .filter(r => _.includes(coworkerIds, r.Id))
        .map(self.formatRecord))
    })
    .then(formattedRecords => [r1, r2, formattedRecords])
  },

  formatRecord: record => ({
    name: record.FullName,
    email: record.Email,
    created_at: record.CreatedOn,
    updated_at: record.UpdatedOn
  })

}
