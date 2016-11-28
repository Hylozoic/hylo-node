import { compact, merge } from 'lodash'
import sampleData from './sampleData.json'
import formatData from './formatData'
import personalizeData from './personalizeData'
import {
  defaultTimeRange,
  getPosts,
  getRecipients,
  shouldSendData
} from './util'

const templateId = 'tem_eCnLj6q75A7Ruu9zsLgppN'

const timePeriod = type => {
  switch (type) {
    case 'daily': return 'yesterday'
    case 'weekly': return 'last week'
  }
}

export const prepareDigestData = (id, type, opts = {}) => {
  let startTime = opts.startTime
  let endTime = opts.endTime
  if (!opts.startTime) {
    const range = defaultTimeRange(type)
    startTime = range[0]
    endTime = range[1]
  }
  return Community.find(id).then(c =>
    getPosts(c, startTime, endTime)
    .then(formatData(c))
    .then(data => merge({
      community_id: c.id,
      community_name: c.get('name'),
      community_avatar_url: c.get('avatar_url'),
      community_url: Frontend.Route.community(c),
      time_period: timePeriod(type)
    }, data)))
}

const sendToUser = (user, data, opts = {}) =>
  personalizeData(user, data, opts)
  .then(data =>
    opts.dryRun ||
    Email.sendSimpleEmail(user.get('email'), templateId, data, {
      sender: {name: data.community_name || 'Hylo'},
      version_name: 'simpler'
    }))

export const sendDigestToUser = (id, userId, type, opts = {}) =>
  prepareDigestData(id, type, opts).then(data =>
    (shouldSendData(data, id) || Promise.resolve(opts.forceSend))
    .then(ok => ok && User.find(userId).then(user =>
      sendToUser(user, data, opts))))

export const sendDigest = (id, type, opts) =>
  prepareDigestData(id, type, opts).then(data =>
    shouldSendData(data, id).then(ok => ok && getRecipients(id, type)
    .then(users => Promise.each(users, user => sendToUser(user, data, opts)))
    .then(users => users.length)))

export const sendAllDigests = (type, opts) =>
  Community.where('daily_digest', true).query().pluck('id')
  .then(ids => Promise.map(ids, id =>
    sendDigest(id, type, opts).then(count => count && [id, count]))
  .then(compact))

export const sendSampleData = address =>
  Email.sendSimpleEmail(address, templateId, sampleData)
