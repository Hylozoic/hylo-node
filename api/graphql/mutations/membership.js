const { GraphQLYogaError } = require('@graphql-yoga/node')
import { isEmpty, mapKeys, pick, snakeCase } from 'lodash'

export async function updateMembership (userId, { groupId, data, data: { settings } }) {
  const whitelist = mapKeys(pick(data, [
    'newPostCount'
  ]), (v, k) => snakeCase(k))
  if (data.lastViewedAt) settings.lastReadAt = data.lastViewedAt // legacy
  if (data.lastReadAt) settings.lastReadAt = data.lastReadAt
  if (isEmpty(settings) && isEmpty(whitelist)) return Promise.resolve(null)

  return bookshelf.transaction(async transaction => {
    const membership = await GroupMembership.forIds(userId, groupId).fetch({ transaction })
    if (!membership) throw new GraphQLYogaError("Couldn't find membership for group with id", groupId)
    if (!isEmpty(settings)) membership.addSetting(settings)
    if (!isEmpty(whitelist)) membership.set(whitelist)
    if (membership.changed) await membership.save()
    if (data.acceptAgreements) {
      const groupAgreements = await GroupAgreement.where({ group_id: groupId }).fetchAll({ transaction })
      for (const ga of groupAgreements) {
        const attrs = { group_id: groupId, user_id: userId, agreement_id: ga.get('agreement_id') }
        await UserGroupAgreement
          .where(attrs)
          .fetch({ transaction })
          .then(async (uga) => {
            if (uga && !uga.get('accepted')) {
              await uga.save({ accepted: true }, { transaction })
            } else {
              await UserGroupAgreement.forge(attrs).save({}, { transaction })
            }
          })
      }
    }
    return membership
  })
}
