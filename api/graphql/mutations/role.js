const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function addGroupRole ({ groupId, color, name, description, emoji, userId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (groupId && name && emoji) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      return GroupRole.forge({ group_id: groupId, name, description, emoji, active: true, color }).save().then((savedGroupRole) => savedGroupRole)
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to create group role`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to create group role: received ${JSON.stringify({ groupId, name, emoji })}`)
  }
}

export async function updateGroupRole ({ groupRoleId, color, name, description, emoji, userId, active, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (groupRoleId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      return bookshelf.transaction(async transacting => {
        const groupRole = await GroupRole.where({ id: groupRoleId}).fetch()
        const verifiedActiveParam = (active == null) ? groupRole.get('active') : active
        const updatedAttributes = {
          color: color || groupRole.get('color'),
          name: name || groupRole.get('name'),
          description: description || groupRole.get('description'),
          emoji: emoji || groupRole.get('emoji'),
          active: verifiedActiveParam,
        }

        return groupRole.save(updatedAttributes, { transacting }).then((savedGroupRole) => savedGroupRole)
      })
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to update a group role`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to update group role: received ${JSON.stringify({ groupId, name, emoji, groupRoleId, active })}`)
  }

}

export async function addRoleToMember ({ userId, groupRoleId, personId, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (personId && groupRoleId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      return MemberRole.forge({group_role_id: groupRoleId, user_id: personId, active: true, group_id: groupId}).save().then((savedMemberRole) => savedMemberRole)
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to add role to member`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to add role to member: received ${JSON.stringify({ personId, groupRoleId })}`)
  }
}

export async function removeRoleFromMember ({ userId, groupRoleId, personId, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (personId && groupRoleId && groupId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR) || userId === personId) {
      const memberRole = await MemberRole
        .query(q => {
          return q.where('user_id', personId)
                  .andWhere('group_role_id', groupRoleId)
        })
        .fetch()
      return memberRole.destroy()
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to remove role from member`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to remove role from member: received ${JSON.stringify({ personId, groupRoleId, groupId })}`)
  }

}
