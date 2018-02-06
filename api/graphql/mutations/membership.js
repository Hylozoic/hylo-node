import { isEmpty, mapKeys, pick, snakeCase } from 'lodash'

export async function updateMembership (userId, { communityId, data, data: { settings } }) {
  const whitelist = mapKeys(pick(data, [
    'newPostCount'
  ]), (v, k) => snakeCase(k))
  if (data.lastViewedAt) settings.lastReadAt = data.lastViewedAt // legacy
  if (data.lastReadAt) settings.lastReadAt = data.lastReadAt
  if (isEmpty(settings) && isEmpty(whitelist)) return Promise.resolve(null)

  const membership = await GroupMembership.forIds(userId, communityId, Community).fetch()
  if (!membership) throw new Error("Couldn't find membership for community with id", communityId)
  if (!isEmpty(settings)) membership.addSetting(settings)
  if (!isEmpty(whitelist)) membership.set(whitelist)
  if (membership.changed) await membership.save()
  return membership
}
