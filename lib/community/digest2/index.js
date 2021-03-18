import { compact, merge } from 'lodash'
import sampleData from './sampleData.json'
import formatData from './formatData'
import personalizeData from './personalizeData'
import {
  defaultTimeRange,
  getPostsAndComments,
  getRecipients,
  shouldSendData
} from './util'

const DIGEST_TEMPLATE_ID = 'tem_eCnLj6q75A7Ruu9zsLgppN'
const SAVED_SEARCH_TEMPLATE_ID = 'tem_GqjMtFKdPHjPHvkqyHBD7C3P'

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
  return Group.find(id).then(c =>
    getPostsAndComments(c, startTime, endTime)
    .then(formatData(c))
    .then(data => merge({
      group_id: c.id,
      group_name: c.get('name'),
      group_avatar_url: c.get('avatar_url'),
      group_url: Frontend.Route.group(c),
      time_period: timePeriod(type)
    }, data)))
}

export const sendToUser = (user, data, opts = {}) => {
  const versionName = 'Holonic architecture'
  const templateId = data.search ? SAVED_SEARCH_TEMPLATE_ID : DIGEST_TEMPLATE_ID
  return personalizeData(user, data, merge(opts, {versionName}))
  .then(data =>
    opts.dryRun ||
    Email.sendSimpleEmail(user.get('email'), templateId, data, {
      sender: {name: data.group_name || 'Hylo'},
      version_name: versionName
    }))
}

export const sendDigest = (id, type, opts = {}) => {
  return prepareDigestData(id, type, opts).then(data =>
    shouldSendData(data, id)
      .then(ok => ok && getRecipients(id, type)
        .then(users => Promise.each(users, user => sendToUser(user, data, opts)))
        .then(users => users.length)))
}

export const sendAllDigests = (type, opts) =>
  Group.where({active: true}).query().pluck('id')
  .then(ids => Promise.map(ids, id =>
    sendDigest(id, type, opts).then(count => count && [id, count]))
  .then(compact))

export const sendSampleData = address =>
  Email.sendSimpleEmail(address, templateId, sampleData)
