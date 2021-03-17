import GroupService from '../../services/GroupService'
import convertGraphqlData from './convertGraphqlData'
import underlyingDeleteGroupTopic from '../../models/group/deleteGroupTopic'

// Util function
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

// Group Mutations

export async function addModerator (userId, personId, groupId) {
  const group = await getModeratedGroup(userId, groupId)
  await GroupMembership.setModeratorRole(personId, group)
  return group
}

export async function createGroup (userId, data) {
  return Group.create(userId, convertGraphqlData(data))
}

export async function deleteGroup (userId, groupId) {
  await getModeratedGroup(userId, groupId)

  await Group.deactivate(groupId)
  return {success: true}
}

export async function deleteGroupTopic (userId, groupTopicId) {
  const groupTopic = await GroupTag.where({id: groupTopicId}).fetch()

  await getModeratedGroup(userId, groupTopic.get('group_id'))

  await underlyingDeleteGroupTopic(groupTopic)
  return {success: true}
}

export async function deleteGroupRelationship (userId, parentId, childId) {
  const groupRelationship = await GroupRelationship.forPair(parentId, childId).fetch()
  if (!groupRelationship) {
    return {success: true}
  }
  let childGroup, parentGroup
  try {
    childGroup = await getModeratedGroup(userId, groupRelationship.get('child_group_id'))
  } catch(e) {}
  try {
    parentGroup = await getModeratedGroup(userId, groupRelationship.get('parent_group_id'))
  } catch(e) {}

  if (childGroup || parentGroup) {
    // the logged in user is a moderator of one of the groups and so can delete the relationship
    await groupRelationship.save({ active: false })
    return { success: true }
  }
  throw new Error("You don't have permission to do this")
}

export async function joinGroup (groupId, userId) {
  const user = await User.find(userId)
  if(!user) throw new Error(`User id ${userId} not found`)
  const group = await Group.find(groupId)
  if(!group) throw new Error(`Group id ${groupId} not found`)
  // TODO: what about hidden groups? can you use this
  if (group.get('accessibility') !== Group.Accessibility.OPEN) {
    throw new Error(`You do not have permisson to do that`)
  }
  return user.joinGroup(group)
}

export async function regenerateAccessCode (userId, groupId) {
  const group = await getModeratedGroup(userId, groupId)
  const code = await Group.getNewAccessCode()
  return group.save({access_code: code}, {patch: true}) // eslint-disable-line camelcase
}

/**
 * As a moderator, removes member from a group.
 */
export async function removeMember (loggedInUserId, userIdToRemove, groupId) {
  const group = await getModeratedGroup(loggedInUserId, groupId)
  await GroupService.removeMember(userIdToRemove, groupId)
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

export async function updateGroup (userId, groupId, changes) {
  const group = await getModeratedGroup(userId, groupId)
  return group.update(convertGraphqlData(changes))
}

// ******* GroupRelationshipInvites ******** //
export async function inviteGroupToGroup(userId, fromId, toId, type) {
  const toGroup = await Group.find(toId)
  if (!toGroup) {
    throw new Error('Group not found')
  }

  if (!Object.values(GroupRelationshipInvite.TYPE).includes(type)) {
    throw new Error('Invalid group relationship type')
  }

  const fromGroup = await getModeratedGroup(userId, fromId)

  if (await GroupRelationship.forPair(fromGroup, toGroup).fetch()) {
    throw new Error('Groups are already related')
  }

  // If current user is a moderator of both the from group and the to group they can automatically join the groups together
  if (await GroupMembership.hasModeratorRole(userId, toGroup)) {
    if (type === GroupRelationshipInvite.TYPE.ParentToChild) {
      return { success: true, groupRelationship: await fromGroup.addChild(toGroup) }
    } if (type === GroupRelationshipInvite.TYPE.ChildToParent) {
      return { success: true, groupRelationship: await fromGroup.addParent(toGroup) }
    }
  } else {
    const existingInvite = GroupRelationshipInvite.forPair(fromGroup, toGroup).fetch()
    if (existingInvite && existingInvite.status === GroupRelationshipInvite.STATUS.Pending) {
      return { success: false, groupRelationshipInvite: existingInvite }
    }
    // If there's an existing processed invite then let's leave it and create a new one
    // TODO: what if the last one was rejected, do we let them create a new one?
    const invite = await GroupRelationshipInvite.create({
      userId,
      fromGroupId: fromId,
      toGroupId: toId,
      type
    })
    return { success: true, groupRelationshipInvite: invite }
  }
}

export async function acceptGroupRelationshipInvite (userId, groupRelationshipInviteId) {
  const invite = await GroupRelationshipInvite.where({id: groupRelationshipInviteId}).fetch()
  if (invite) {
    if (GroupMembership.hasModeratorRole(userId, invite.get('to_group_id'))) {
      const groupRelationship = await invite.accept(userId)
      return { success: !!groupRelationship, groupRelationship }
    } else {
      throw new Error(`You do not have permission to do this`)
    }
  } else {
    throw new Error(`Invalid parameters to accept invite`)
  }
}

export async function cancelGroupRelationshipInvite (userId, groupRelationshipInviteId) {
  const invite = await GroupRelationshipInvite.where({id: groupRelationshipInviteId}).fetch()
  if (invite) {
    if (GroupMembership.hasModeratorRole(userId, invite.get('from_group_id'))) {
      return { success: await invite.cancel(userId) }
    } else {
      throw new Error(`You do not have permission to do this`)
    }
  } else {
    throw new Error(`Invalid parameters to cancel invite`)
  }
}

export async function rejectGroupRelationshipInvite (userId, groupRelationshipInviteId) {
  const invite = await GroupRelationshipInvite.where({id: groupRelationshipInviteId}).fetch()
  if (invite) {
    if (GroupMembership.hasModeratorRole(userId, invite.get('to_group_id'))) {
      return { success: await invite.reject(userId) }
    } else {
      throw new Error(`You do not have permission to do this`)
    }
  } else {
    throw new Error(`Invalid parameters to reject invite`)
  }
}
