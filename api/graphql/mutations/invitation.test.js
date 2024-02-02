import factories from '../../../test/setup/factories'
import { createInvitation } from './invitation'

describe('invitation mutation', () => {
  var user, group

  before(function () {
    user = factories.user()
    group = factories.group()
    return Promise.join(group.save(), user.save())
    .then(() => user.joinGroup(group, { role: GroupMembership.Role.MODERATOR }))
  })

  it('createInvitation successfully', () => {
    const data = {emails: ['one@test.com', 'two@test.com'], message: 'test message', moderator: true}
    return createInvitation(user.id, group.id, data)
    .then((ret) => expect(ret.invitations).to.have.lengthOf(2))
  })
})
