import { expect } from 'chai'
import setup from '../../../test/setup'
import factories from '../../../test/setup/factories'
import {
  addGroupRole,
  addRoleToMember,
  removeRoleFromMember,
  updateGroupRole
} from './role'

describe('roles mutations', () => {
  let user, user2, group

  const color = 'blue'
  const emoji = ':)'
  const emoji2 = ':('
  const name = 'Greeter'

  before(function () {
    user = factories.user()
    user2 = factories.user()
    group = factories.group()
    return Promise.join(group.save(), user.save(), user2.save())
      .then(() => user.joinGroup(group))
      .then(() => user2.joinGroup(group, { role: GroupMembership.Role.MODERATOR }))

  })

  after(async () => setup.clearDb())

  it('creates a group role for a group', async () => {
    const groupRole = await addGroupRole({ groupId: group.id, color, name, emoji, userId: user2.id })
    expect(groupRole.get('color')).to.equal('blue')
  })

  it('throws an error if a non-mod create a group role', async () => {
    await expect(addGroupRole({ groupId: group.id, color, name, emoji, userId: user.id })).to.eventually.be.rejectedWith("User doesn't have required privileges to create group role")
  })

  it('adds a role to a group member', async () => {
    const groupRole = await addGroupRole({ groupId: group.id, color, name, emoji, userId: user2.id })
    const memberRole = await addRoleToMember({ userId: user2.id, roleId: groupRole.get('id'), personId: user.id, groupId: group.id })
    expect(parseInt(memberRole.get('group_role_id'))).to.equal(groupRole.get('id'))
  })

  it('removes a group role from a group member', async () => {
    const groupRole = await addGroupRole({ groupId: group.id, color, name, emoji, userId: user2.id })
    const memberRole = await addRoleToMember({ userId: user2.id, roleId: groupRole.get('id'), personId: user.id, groupId: group.id })
    const deleted = await removeRoleFromMember({ userId: user2.id, roleId: groupRole.get('id'), personId: user.id, groupId: group.id })
    expect(deleted.get('id')).to.equal(undefined)
  })

  it('updates a group role', async () => {
    const groupRole = await addGroupRole({ groupId: group.id, color, name, emoji, userId: user2.id })
    const updatedGroupRole = await updateGroupRole({ groupId: group.id, color: 'green', name, emoji, userId: user2.id, groupRoleId: groupRole.get('id') })
    expect(updatedGroupRole.get('color')).to.equal('green')

  })
})