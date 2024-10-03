export async function createZapierTrigger (userId, groupIds, targetUrl, type, params) {
  return bookshelf.transaction(async (transacting) => {
    const trigger = await ZapierTrigger.forge({ user_id: userId, target_url: targetUrl, type, params }).save({}, { transacting })

    if (groupIds && groupIds.length > 0) {
      const memberships = await GroupMembership.query(q => q.where({ user_id: userId }).whereIn('group_id', groupIds)).fetchAll({ transacting })
      if (!memberships || memberships.length === 0) {
        throw new GraphQLYogaError('You don\'t have access to any of these groups')
      }
      await trigger.groups().attach(memberships.map(m => m.get('group_id')), { transacting })
    }

    return trigger
  })
}

export async function deleteZapierTrigger (userId, id) {
  return bookshelf.transaction(async (transacting) => {
    const trigger = await ZapierTrigger.query(q => q.where({ id, userId })).fetch()

    if (trigger) {
      await ZapierTriggerGroup.where({ zapier_trigger_id: id }).destroy({ transacting })
      await trigger.destroy({ transacting })
    }
    return true
  })
}
