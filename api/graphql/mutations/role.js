import GroupRole from '../../models/GroupRole'

const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function addGroupRole ({ groupId, color, name, emoji, userId }){
  if (!userId) throw new GraphQLYogaError(`No userId passed into function`)

  if (groupId && name && emoji) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      const newGroupRole = { groupId, name, emoji, userId, active: true }
      if (color) newGroupRole.color = color
      return GroupRole.forge(newGroupRole).save().then((savedGroupRole) => savedGroupRole)
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to create group role`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to create group role: received ${{ groupId, name, emoji }}`)
  }
}

export async function updateGroupRole ({ groupRoleId, color, name, emoji, userId, active }){
  if (!userId) throw new GraphQLYogaError(`No userId passed into function`)

  if (groupRoleId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      const groupRole = await GroupRole.query('where', 'id', '=', groupRoleId).fetch()
      const verifiedActiveParam = (active == null) ? groupRole.get('active') : active
      const updatedAttributes = {
        color: color || groupRole.get('color'),
        name: name || groupRole.get('name'),
        emoji: emoji || groupRole.get('emoji'),
        active: verifiedActiveParam,
      }

      return bookshelf.transaction(async transacting => {
        if (verifiedActiveParam !== groupRole.get('active')) {
          await MemberRole.where({group_role_id: groupRoleId}).save({active: verifiedActiveParam}, { transacting } )
        }
  
        return groupRole.save(updatedAttributes, { transacting }).then((savedGroupRole) => savedGroupRole)
      })
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to update a group role`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to update group role: received ${{ groupId, name, emoji, groupRoleId, active }}`)
  }

}

export async function addRoleToMember ({userId, groupRoleId, personId}){
  if (!userId) throw new GraphQLYogaError(`No userId passed into function`)

  if (personId && groupRoleId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      return MemberRole.forge({groupRoleId, userId: personId, active: true}).save().then((savedMemberRole) => savedMemberRole)
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to add role to member`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to add role to member: received ${{ personId, groupRoleId }}`)
  }
}

export async function removeRoleFromMember ({userId, memberRoleId, personId}){
  if (!userId) throw new GraphQLYogaError(`No userId passed into function`)

  if (personId && groupRoleId) {
    const groupMembership = await GroupMembership.forIds(userId, groupId).fetch()

    if (groupMembership && (groupMembership.get('role') === GroupMembership.Role.MODERATOR)) {
      const memberRole = await MemberRole.query('where', 'id', '=', memberRoleId).fetch()
      return memberRole.destory()
    } else {
      throw new GraphQLYogaError(`User doesn't have required privileges to remove role from member`)
    }
  } else {
    throw new GraphQLYogaError(`Invalid/undefined parameters to remove role from member: received ${{ personId, memberRoleId }}`)
  }

}
