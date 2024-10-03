/* globals UserImport, NexudusAccount */
import request from 'request'
var Promise = require('bluebird')
var get = Promise.promisify(request.get, request)
import { includes } from 'lodash'
import { filter, map, compact } from 'lodash/fp'

// Nexudus app requires the following permissions
// Business-Read, CoworkerContract-List, ProductNote-List, User-List, Coworker-List

const apiHost = 'https://spaces.nexudus.com/api'
const pageSize = 10000

const avatarUrl = (id, subdomain) =>
  `https://${subdomain}.spaces.nexudus.com/en/coworker/getavatar/${id}?h=150&w=150`

const formatRecord = subdomain => record => {
  if (!record.Email) return null
  return ({
    name: record.FullName,
    email: record.Email.trim(),
    created_at: record.CreatedOn,
    updated_at: record.UpdatedOn,
    avatar_url: avatarUrl(record.Id, subdomain)
  })
}

const logCount = label => ({ length }) => console.log(`${label}: ${length}`)

// spaceId can be found by clicking through to a space's details page from
// https://spaces.nexudus.com/Sys/Businesses; it is the number at the end of the
// details page's URL, after "Edit"
const API = function (username, password, spaceId, options = {}) {
  this.username = username
  this.password = password
  this.spaceId = spaceId
  this.options = options
}

API.prototype.get = function (path, qs) {
  return get({
    url: apiHost + '/' + path,
    json: true,
    auth: {user: this.username, pass: this.password},
    qs
  }).then(([res, body]) => {
    if (res.statusCode !== 200) {
      throw new Error(res.statusCode)
    }
    return body
  })
}

API.prototype.getAllRecords = function (path, query) {
  const getPage = page =>
    this.get(path, Object.assign({size: pageSize, page}, query))
    .then(({ CurrentPage, TotalPages, Records }) =>
      CurrentPage < TotalPages ? Records.concat(getPage(page + 1)) : Records)

  return getPage(1)
}

API.prototype.getSpaceInfo = function () {
  return this.get(`sys/businesses/${this.spaceId}`)
}

API.prototype.getActiveContracts = function () {
  return this.getAllRecords('billing/coworkercontracts', {CoworkerContract_Active: true})
  .tap(logCount('contracts'))
}

API.prototype.getActiveCoworkers = function () {
  return this.getAllRecords('spaces/coworkers', {
    Coworker_Active: true,
    Coworker_InvoicingBusiness: this.spaceId
  })
  .tap(logCount('coworkers'))
}

// members are users who are active and have an active contract
API.prototype.fetchMembers = function () {
  let contracts, coworkers
  const intersects = record =>
    includes(map('CoworkerId', contracts), record.Id)

  return this.getSpaceInfo().tap(info => { this.subdomain = info.WebAddress })
  .then(() => this.getActiveContracts().tap(r1 => { contracts = r1 }))
  .then(() => this.getActiveCoworkers().tap(r2 => { coworkers = r2 }))
  .then(filter(intersects))
  .tap(logCount('active members'))
  .then(records => compact(map(formatRecord(this.subdomain), records)))
  .then(records => this.options.verbose ? {contracts, coworkers, records} : records)
}

API.prototype.updateMembers = function () {
  return this.fetchMembers()
  .tap(records => console.log('about to create users', records.length))
  .then(records => Promise.map(records, r => UserImport.createUser(r, this.options)))
  .then(users => compact(users).length)
}

API.prototype.updateMemberImages = function () {
  this.options.verbose = true
  return this.fetchMembers()
  .then(({ contracts, coworkers, records }) =>
    Promise.map(records, r => {
      const coworker = coworkers.find(c => c.Email.trim() === r.email)
      return User.find(r.email)
      .then(user => {
        if (!user || !user.hasNoAvatar()) return
        const avatar_url = avatarUrl(coworker.Id, this.subdomain)
        console.log(`${user.id}: ${avatar_url}`)
        return user.save({avatar_url}, {patch: true})
      })
    }))
  .then(users => compact(users).length)
}

module.exports = {
  forAccount: function (nexudusAccount, opts = {}) {
    const username = nexudusAccount.get('username')
    const password = nexudusAccount.decryptedPassword()
    const spaceId = nexudusAccount.get('space_id')
    return new API(username, password, spaceId, opts)
  },

  forGroup: function (group_id, opts) {
    return NexudusAccount.where({group_id}).fetch()
    .then(a => this.forAccount(a, opts))
  },

  updateAllCommunities: function (options) {
    return NexudusAccount.where('autoupdate', true)
    .fetchAll({withRelated: 'group'})
    .then(accounts => Promise.map(accounts.models, account => {
      const { group } = account.relations
      const api = this.forAccount(account, Object.assign({group}, options))
      return api.updateMembers()
      .then(count => [account.get('group_id'), count])
    }))
  }
}
