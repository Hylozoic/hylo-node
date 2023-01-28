export async function createZapierTrigger (userId, groupId, targetUrl, type) {
  if (groupId) {
    //const group = await Group.find(groupId)
    const membership = await GroupMembership.forPair(userId, groupId)
    if (!membership) {
      throw new GraphQLYogaError('You don\'t have access to a group with this ID')
    }
  }

  const trigger = await ZapierTrigger.forge({ user_id: userId, group_id: groupId, target_url: targetUrl, type }).save()
  return trigger
}

export async function deleteZapierTrigger (userId, id) {
  const trigger = await ZapierTrigger.query(q => q.where({ id, userId })).fetch()

  if (trigger) {
    await trigger.destroy()
  }
  return true
}
