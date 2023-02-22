export async function createZapierTrigger (userId, groupIds, targetUrl, type, params) {
  const trigger = ZapierTrigger.forge({ user_id: userId, target_url: targetUrl, type, params })

  if (groupIds && groupIds.length > 0) {
    const memberships = await GroupMembership.query(q => q.where({ user_id: userId }).whereIn('group_id', groupIds)).fetchAll()
    if (!memberships || memberships.length === 0) {
      throw new GraphQLYogaError('You don\'t have access to any of these groups')
    }
    trigger.groups().attach(memberships.map(m => m.group_id))
  }

  return trigger.save()
}

export async function deleteZapierTrigger (userId, id) {
  const trigger = await ZapierTrigger.query(q => q.where({ id, userId })).fetch()

  if (trigger) {
    await trigger.destroy()
  }
  return true
}
