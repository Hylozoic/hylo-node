import GroupService from '../../services/GroupService'
import convertGraphqlData from './convertGraphqlData'
import underlyingDeleteGroupTopic from '../../models/group/deleteGroupTopic'

const { GraphQLYogaError } = require('@graphql-yoga/node')

// Util function
async function getStewardedGroup (userId, groupId, additionalResponsibility = '', opts = {}) {
  const group = await Group.find(groupId, opts)
  if (!group) {
    throw new GraphQLYogaError('Group not found')
  }

  const isSteward = await GroupMembership.hasResponsibility(userId, group, additionalResponsibility, opts)
  if (!isSteward) {
    throw new GraphQLYogaError("You don't have the right responsibilities for this group")
  }

  return group
}

// Group Mutations

export async function addModerator (userId, personId, groupId) {
  const group = await getStewardedGroup(userId, groupId, Responsibility.constants.RESP_ADMINISTRATION)
  await GroupMembership.setModeratorRole(personId, group)
  return group
}

export async function createGroup (userId, data) {
  return Group.create(userId, convertGraphqlData(data))
}

export async function deleteGroup (userId, groupId) {
  await getStewardedGroup(userId, groupId, Responsibility.constants.RESP_ADMINISTRATION)

  await Group.deactivate(groupId)
  return { success: true }
}

export async function deleteGroupTopic (userId, groupTopicId) {
  const groupTopic = await GroupTag.where({ id: groupTopicId }).fetch()

  await getStewardedGroup(userId, groupTopic.get('group_id'), Responsibility.constants.RESP_MANAGE_CONTENT)

  await underlyingDeleteGroupTopic(groupTopic)
  return { success: true }
}

export async function deleteGroupRelationship (userId, parentId, childId) {
  const groupRelationship = await GroupRelationship.forPair(parentId, childId).fetch()
  if (!groupRelationship) {
    return { success: true }
  }
  let childGroup, parentGroup
  try {
    childGroup = await getStewardedGroup(userId, groupRelationship.get('child_group_id'), Responsibility.constants.RESP_ADMINISTRATION)
  } catch (e) {}
  try {
    parentGroup = await getStewardedGroup(userId, groupRelationship.get('parent_group_id'), Responsibility.constants.RESP_ADMINISTRATION)
  } catch (e) {}

  if (childGroup || parentGroup) {
    // the logged in user is a steward of one of the groups and so can delete the relationship
    await groupRelationship.save({ active: false })
    return { success: true }
  }
  throw new GraphQLYogaError("You don't have permission to do this")
}

// Called when a user joins an open group
export async function joinGroup (groupId, userId, questionAnswers) {
  const user = await User.find(userId)
  if (!user) throw new GraphQLYogaError(`User id ${userId} not found`)
  const group = await Group.find(groupId)
  if (!group) throw new GraphQLYogaError(`Group id ${groupId} not found`)
  // TODO: what about hidden groups? can you join them? for now we are going with yes if not closed
  if (group.get('accessibility') !== Group.Accessibility.OPEN) {
    throw new GraphQLYogaError('You do not have permisson to do that')
  }
  // Make sure user is first a member of all prerequisite groups
  const prerequisiteGroups = await group.prerequisiteGroups().fetch()
  await Promise.map(prerequisiteGroups.models, async (prereq) => {
    const isMemberOfPrereq = await GroupMembership.forPair(userId, prereq.id).fetch()
    if (!isMemberOfPrereq) {
      throw new GraphQLYogaError(`You must be a member of group ${prereq.get('name')} first`)
    }
  })
  return user.joinGroup(group, { questionAnswers })
}

export async function regenerateAccessCode (userId, groupId) {
  const group = await getStewardedGroup(userId, groupId, Responsibility.constants.RESP_ADD_MEMBERS)
  const code = await Group.getNewAccessCode()
  return group.save({ access_code: code }, { patch: true }) // eslint-disable-line camelcase
}

/**
 * As a host, removes member from a group.
 */
export async function removeMember (loggedInUserId, userIdToRemove, groupId) {
  const group = await getStewardedGroup(loggedInUserId, groupId, Responsibility.constants.RESP_REMOVE_MEMBERS)
  await GroupService.removeMember(userIdToRemove, groupId)
  return group
}

export async function removeModerator (userId, personId, groupId, isRemoveFromGroup) {
  const group = await getStewardedGroup(userId, groupId, Responsibility.constants.RESP_ADMINISTRATION)
  if (isRemoveFromGroup) {
    await GroupMembership.removeModeratorRole(personId, group)
    await GroupService.removeMember(personId, groupId)
  } else {
    await GroupMembership.removeModeratorRole(personId, group)
  }

  return group
}

export async function updateGroup (userId, groupId, changes) {
  const group = await getStewardedGroup(userId, groupId, Responsibility.constants.RESP_ADMINISTRATION)

  return group.update(convertGraphqlData(changes), userId)
}

// Group to group relationship mutations
export async function inviteGroupToGroup (userId, fromId, toId, type, questionAnswers = [], opts = {}) {
  const toGroup = await Group.find(toId, opts)
  if (!toGroup) {
    throw new GraphQLYogaError('Group not found')
  }

  if (!Object.values(GroupRelationshipInvite.TYPE).includes(type)) {
    throw new GraphQLYogaError('Invalid group relationship type')
  }

  const fromGroup = await getStewardedGroup(userId, fromId, Responsibility.constants.RESP_ADMINISTRATION, opts)

  if (await GroupRelationship.forPair(fromGroup, toGroup).fetch(opts)) {
    throw new GraphQLYogaError('Groups are already related')
  }

  // If current user is an administrator of both the from group and the to group they can automatically join the groups together
  if (await GroupMembership.hasResponsibility(userId, toGroup, Responsibility.constants.RESP_ADMINISTRATION, opts)) {
    if (type === GroupRelationshipInvite.TYPE.ParentToChild) {
      return { success: true, groupRelationship: await fromGroup.addChild(toGroup, opts) }
    } if (type === GroupRelationshipInvite.TYPE.ChildToParent) {
      return { success: true, groupRelationship: await fromGroup.addParent(toGroup, opts) }
    }
  } else {
    const existingInvite = GroupRelationshipInvite.forPair(fromGroup, toGroup).fetch(opts)

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
    }, opts)

    for (const qa of questionAnswers) {
      await GroupToGroupJoinRequestQuestionAnswer.forge({ join_request_id: invite.id, question_id: qa.questionId, answer: qa.answer }).save({}, opts)
    }
    return { success: true, groupRelationshipInvite: invite }
  }
}

export async function acceptGroupRelationshipInvite (userId, groupRelationshipInviteId) {
  const invite = await GroupRelationshipInvite.where({ id: groupRelationshipInviteId }).fetch()
  if (invite) {
    if (GroupMembership.hasResponsibility(userId, invite.get('to_group_id'), Responsibility.constants.RESP_ADMINISTRATION)) {
      const groupRelationship = await invite.accept(userId)
      return { success: !!groupRelationship, groupRelationship }
    } else {
      throw new GraphQLYogaError('You do not have permission to do this')
    }
  } else {
    throw new GraphQLYogaError('Invalid parameters to accept invite')
  }
}

export async function cancelGroupRelationshipInvite (userId, groupRelationshipInviteId) {
  const invite = await GroupRelationshipInvite.where({ id: groupRelationshipInviteId }).fetch()
  if (invite) {
    if (GroupMembership.hasResponsibility(userId, invite.get('from_group_id'), Responsibility.constants.RESP_ADMINISTRATION)) {
      return { success: await invite.cancel(userId) }
    } else {
      throw new GraphQLYogaError('You do not have permission to do this')
    }
  } else {
    throw new GraphQLYogaError('Invalid parameters to cancel invite')
  }
}

export async function rejectGroupRelationshipInvite (userId, groupRelationshipInviteId) {
  const invite = await GroupRelationshipInvite.where({ id: groupRelationshipInviteId }).fetch()
  if (invite) {
    if (GroupMembership.hasResponsibility(userId, invite.get('to_group_id'), Responsibility.constants.RESP_ADMINISTRATION)) {
      return { success: await invite.reject(userId) }
    } else {
      throw new GraphQLYogaError('You do not have permission to do this')
    }
  } else {
    throw new GraphQLYogaError('Invalid parameters to reject invite')
  }
}

// API only Group Mutations
export async function addMember (userId, groupId, role) {
  const group = await Group.find(groupId)
  if (!group) {
    return { success: false, error: 'Group not found' }
  }

  if (group) {
    await group.addMembers([userId], { role: role || GroupMembership.Role.DEFAULT }, {})
  }
  return { success: true }
}
