var request = require('request')
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)
import { includes } from 'lodash'
import { filter, map } from 'lodash/fp'

const apiHost = 'https://spaces.nexudus.com/api'
const pageSize = 500

const formatRecord = record => ({
  name: record.FullName,
  email: record.Email,
  created_at: record.CreatedOn,
  updated_at: record.UpdatedOn
})

const logCount = label => ({ length }) => console.log(`${label}: ${length}`)

const API = function (username, password) {
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
      qs: Object.assign({
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

API.prototype.getActiveContracts = function () {
  return this.getRecords('billing/coworkercontracts', {CoworkerContract_Active: true})
  .tap(logCount('contracts'))
}

API.prototype.getActiveCoworkers = function () {
  return this.getRecords('spaces/coworkers', {Coworker_Active: true})
  .tap(logCount('coworkers'))
}

module.exports = {
  // members are users who are active and have an active contract
  fetchMembers: function (username, password, verbose) {
    const api = new API(username, password)
    let contracts, coworkers
    const intersects = record =>
      includes(map('CoworkerId', contracts), record.Id)

    return api.getActiveContracts()
    .then(r1 => contracts = r1)
    .then(() => api.getActiveCoworkers())
    .tap(r2 => coworkers = r2)
    .then(filter(intersects))
    .tap(logCount('active members'))
    .then(map(formatRecord))
    .then(records => verbose ? {contracts, coworkers, records} : records)
  }
}
