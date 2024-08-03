const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function addGroupResponsibility ({ groupId, title, description, userId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (groupId && title) {
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)) {
      return Responsibility.forge({ group_id: groupId, title, description, type: 'group' }).save().then((savedGroupResponsibility) => savedGroupResponsibility)
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to create group responsibility')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to create group responsibility: received ${JSON.stringify({ groupId, title })}`)
  }
}

export async function updateGroupResponsibility ({ responsibilityId, title, description, userId, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')
  if (responsibilityId) {
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)) {
      return bookshelf.transaction(async transacting => {
        const groupResponsibility = await Responsibility.where({ id: responsibilityId }).fetch()
        const updatedAttributes = {
          title: title || groupResponsibility.get('title'),
          description: description || groupResponsibility.get('description')
        }

        return groupResponsibility.save(updatedAttributes, { transacting }).then((savedGroupResponsibility) => savedGroupResponsibility)
      })
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to update a group responsibility')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to update group responsibility: received ${JSON.stringify({ groupId, title, responsibilityId })}`)
  }
}

export async function deleteGroupResponsibility ({ responsibilityId, userId, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (responsibilityId) {
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)) {
      const groupRoleResponsibility = await Responsibility.query(q => {
        return q.where('id', responsibilityId)
          .andWhere('group_id', groupId)
      })
        .fetch()
      return groupRoleResponsibility.destroy()
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to delete a group responsibility')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to delete group responsibility: received ${JSON.stringify({ groupId, responsibilityId })}`)
  }
}

export async function addResponsibilityToRole ({ userId, responsibilityId, roleId, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')
  if (responsibilityId && roleId && groupId) {
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)) {
      return GroupRoleResponsibility.forge({ group_role_id: roleId, responsibility_id: responsibilityId }).save().then((savedRoleResponsibility) => savedRoleResponsibility)
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to add responsibility to role')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to add responsibility to role: received ${JSON.stringify({ responsibilityId, roleId, groupId })}`)
  }
}

export async function removeResponsibilityFromRole ({ userId, roleResponsibilityId, groupId }) {
  if (!userId) throw new GraphQLYogaError('No userId passed into function')

  if (roleResponsibilityId && groupId) {
    const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)
    if (responsibilities.includes(Responsibility.constants.RESP_ADMINISTRATION)) {
      const roleResponsibility = await GroupRoleResponsibility.query(q => {
        return q.where('id', roleResponsibilityId)
      })
        .fetch()
      return roleResponsibility.destroy()
    } else {
      throw new GraphQLYogaError('User doesn\'t have required privileges to remove responsibility from role')
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to remove responsibility from role: received ${JSON.stringify({ roleResponsibilityId, groupId })}`)
  }
}
