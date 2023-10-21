import { isEmpty, mapKeys, pick, snakeCase } from 'lodash'
const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function updateMembership (userId, { groupId, data, data: { settings } }) {
  const whitelist = mapKeys(pick(data, [
    'newPostCount'
  ]), (v, k) => snakeCase(k))
  if (data.lastViewedAt) settings.lastReadAt = data.lastViewedAt // legacy
  if (data.lastReadAt) settings.lastReadAt = data.lastReadAt
  if (isEmpty(settings) && isEmpty(whitelist)) return Promise.resolve(null)

  return bookshelf.transaction(async transacting => {
    const membership = await GroupMembership.forIds(userId, groupId).fetch({ transacting })
    if (!membership) throw new GraphQLYogaError("Couldn't find membership for group with id", groupId)
    if (!isEmpty(settings)) membership.addSetting(settings)
    if (!isEmpty(whitelist)) membership.set(whitelist)
    if (membership.changed) await membership.save({}, { transacting })
    if (data.acceptAgreements) {
      await membership.acceptAgreements(transacting)
    }
    return membership
  })
}
