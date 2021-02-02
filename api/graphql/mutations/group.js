import GroupService from '../../services/GroupService'
import convertGraphqlData from './convertGraphqlData'
import underlyingDeleteGroupTopic from '../../models/group/deleteGroupTopic'

export async function updateGroup (userId, groupId, changes) {
  const group = await getModeratedGroup(userId, groupId)
  return group.update(convertGraphqlData(changes))
}

export async function addModerator (userId, personId, groupId) {
  const group = await getModeratedGroup(userId, groupId)
  await GroupMembership.setModeratorRole(personId, group)
  return group
}

export async function removeModerator (userId, personId, groupId, isRemoveFromGroup) {
  const group = await getModeratedGroup(userId, groupId)
  if (isRemoveFromGroup) {
    await GroupMembership.removeModeratorRole(personId, group)
    await GroupService.removeMember(personId, groupId)
  } else {
    await GroupMembership.removeModeratorRole(personId, group)
  }

  return group
}

/**
 * As a moderator, removes member from a group.
 */
export async function removeMember (loggedInUserId, userIdToRemove, groupId) {
  const group = await getModeratedGroup(loggedInUserId, groupId)
  await GroupService.removeMember(userIdToRemove, groupId)
  return group
}

export async function regenerateAccessCode (userId, groupId) {
  const group = await getModeratedGroup(userId, groupId)
  const code = await Group.getNewAccessCode()
  return group.save({access_code: code}, {patch: true}) // eslint-disable-line camelcase
}

export async function createGroup (userId, data) {
  // TODO: fix this to work with multiple parents
  // if (data.parentIds) {
  //   const canModerate = await NetworkMembership.hasModeratorRole(userId, data.networkId)
  //   if (!canModerate) {
  //     throw new Error("You don't have permission to add a group to this network")
  //   }
  // }
  return Group.create(userId, convertGraphqlData(data))
}

async function getModeratedGroup (userId, groupId) {
  const group = await Group.find(groupId)
  if (!group) {
    throw new Error('Group not found')
  }

  const isModerator = await GroupMembership.hasModeratorRole(userId, group)
  if (!isModerator) {
    throw new Error("You don't have permission to moderate this group")
  }

  return group
}

export async function deleteGroupTopic (userId, groupTopicId) {
  const groupTopic = await GroupTag.where({id: groupTopicId}).fetch()

  await getModeratedGroup(userId, groupTopic.get('group_id'))

  await underlyingDeleteGroupTopic(groupTopic)
  return {success: true}
}

export async function deleteGroup (userId, groupId) {
  await getModeratedGroup(userId, groupId)

  await Group.deactivate(groupId)
  return {success: true}
}
