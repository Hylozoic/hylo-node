/* globals UserImport, NexudusAccount */
import request from 'request'
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)
import { compact, includes } from 'lodash'
import { filter, map } from 'lodash/fp'

const apiHost = 'https://spaces.nexudus.com/api'
const pageSize = 500

const formatRecord = record => ({
  name: record.FullName,
  email: record.Email.trim(),
  created_at: record.CreatedOn,
  updated_at: record.UpdatedOn
})

const logCount = label => ({ length }) => console.log(`${label}: ${length}`)

// spaceId can be found by clicking through to a space's details page from
// https://spaces.nexudus.com/Sys/Businesses; it is the number at the end of the
// details page's URL, after "Edit"
const API = function (username, password, options = {}) {
  this.username = username
  this.password = password
  this.options = options
}

API.prototype.getRecords = function (path, query) {
  var self = this
  var getPage = function (pageNum) {
    var url = format('%s/%s', apiHost, path)
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
  return this.getRecords('spaces/coworkers', {
    Coworker_Active: true,
    Coworker_InvoicingBusiness: this.options.spaceId
  })
  .tap(logCount('coworkers'))
}

// members are users who are active and have an active contract
API.prototype.fetchMembers = function () {
  let contracts, coworkers
  const intersects = record =>
    includes(map('CoworkerId', contracts), record.Id)

  return this.getActiveContracts().tap(r1 => contracts = r1)
  .then(() => this.getActiveCoworkers().tap(r2 => coworkers = r2))
  .then(filter(intersects))
  .tap(logCount('active members'))
  .then(map(formatRecord))
  .then(records => this.options.verbose ? {contracts, coworkers, records} : records)
}

API.prototype.updateMembers = function () {
  return this.fetchMembers()
  .then(records => Promise.map(records, r => UserImport.createUser(r, this.options)))
  .then(users => compact(users).length)
}

module.exports = {
  forAccount: function (nexudusAccount, opts = {}) {
    const username = nexudusAccount.get('username')
    const password = nexudusAccount.decryptedPassword()
    const spaceId = nexudusAccount.get('space_id')
    return new API(username, password, Object.assign({spaceId}, opts))
  },

  forCommunity: function (community_id, opts) {
    return NexudusAccount.where({community_id}).fetch()
    .then(a => this.forAccount(a, opts))
  },

  updateAllCommunities: function (options) {
    return NexudusAccount.where('autoupdate', true)
    .fetchAll({withRelated: 'community'})
    .then(accounts => Promise.map(accounts.models, account => {
      const { community } = account.relations
      const api = this.forAccount(account, Object.assign({community}, options))
      return api.updateMembers()
      .then(count => [account.get('community_id'), count])
    }))
  }
}
