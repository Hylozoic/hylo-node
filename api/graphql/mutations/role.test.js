import '../../../test/setup'
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
    user2 = factories.user({role: GroupMembership.Role.MODERATOR})
    group = factories.group()
    return Promise.join(group.save(), user.save(), user2.save())
    .then(() => user.joinGroup(group))
    .then(() => user2.joinGroup(group))

    it('creates a group role for a group', async () => {
      const groupRole = await addGroupRole({ groupId: group.id, color, name, emoji, userId: user2.id })

      expect(groupRole.color.to.equal('blue'))
    })

    it('throws an error if a non-mod create a group role', async () => {
      addGroupRole({ groupId: group.id, color, name, emoji, userId: user.id })

    })

    it('adds a role to a group member', async () => {})

    it('removes a group role from a group member', async () => {})

    it('updates a group role', async () => {})

    it('deactivates a member role when a group role is deactivated', async () => {})

  })

})