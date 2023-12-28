const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function addGroupRole ({ groupId, color, name, description, emoji, userId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (groupId && name && emoji) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)

    if (groupMembership && ((groupMembership.get('role') === GroupMembership.Role.MODERATOR || responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)))) {
      return GroupRole.forge({ group_id: groupId, name, description, emoji, active: true, color }).save().then((savedGroupRole) => savedGroupRole)
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to create group role')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to create group role: received ${JSON.stringify({ groupId, name, emoji })}`)
  }
}

export async function updateGroupRole ({ groupRoleId, color, name, description, emoji, userId, active, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (groupRoleId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (groupMembership && ((groupMembership.get('role') === GroupMembership.Role.MODERATOR || responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)))) {
      return bookshelf.transaction(async transacting => {
        const groupRole = await GroupRole.where({ id: groupRoleId}).fetch()
        const verifiedActiveParam = (active == null) ? groupRole.get('active') : active
        const updatedAttributes = {
          color: color || groupRole.get('color'),
          name: name || groupRole.get('name'),
          description: description || groupRole.get('description'),
          emoji: emoji || groupRole.get('emoji'),
          active: verifiedActiveParam
        }

        return groupRole.save(updatedAttributes, { transacting }).then((savedGroupRole) => savedGroupRole)
      })
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to update a group role')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to update group role: received ${JSON.stringify({ groupId, name, emoji, groupRoleId, active })}`)
  }

}

export async function addRoleToMember ({ userId, roleId, personId, groupId, isCommonRole }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (personId && roleId) {
    const actorGroupMembership = await GroupMembership.forIds(userId, groupId).fetch()
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (actorGroupMembership && ((actorGroupMembership.get('role') === GroupMembership.Role.MODERATOR || responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)))) {
      const groupMembership = await GroupMembership.forIds(personId, groupId).fetch()
      const useThisModel = isCommonRole ? MemberCommonRole : MemberRole
      const useThisData = isCommonRole ? { common_role_id: roleId, user_id: personId, group_id: groupId, group_membership_id: groupMembership.id } : { group_role_id: roleId, user_id: personId, active: true, group_id: groupId }
      return useThisModel.forge(useThisData).save().then((savedRole) => savedRole)
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to add role to member')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to add role to member: received ${JSON.stringify({ personId, roleId })}`)
  }
}

export async function removeRoleFromMember ({ userId, roleId, personId, groupId, isCommonRole }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (personId && roleId && groupId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (groupMembership && ((groupMembership.get('role') === GroupMembership.Role.MODERATOR || responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)) || userId === personId)) {
      const useThisModel = isCommonRole
        ? MemberCommonRole.query(q => {
            return q.where('user_id', personId)
              .andWhere('common_role_id', roleId)
              .andWhere('group_id', groupId)
          })
        : MemberRole.query(q => {
          return q.where('user_id', personId)
            .andWhere('group_role_id', roleId)
        })
      // actually have to do something here with isCommonRole
      const role = await useThisModel
        .fetch()
      return role.destroy()
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to remove role from member')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to remove role from member: received ${JSON.stringify({ personId, roleId, groupId })}`)
  }

}
