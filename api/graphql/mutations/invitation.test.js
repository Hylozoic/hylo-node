import factories from '../../../test/setup/factories'
import { createInvitation } from './invitation'

describe('invitation mutation', () => {
  var user, community

  before(function () {
    user = factories.user()
    community = factories.community()
    return Promise.join(community.save(), user.save())
    .then(() => user.joinCommunity(community, GroupMembership.Role.MODERATOR))
  })

  it('createInvitation successfully', () => {
    const data = {emails: ['one@test.com', 'two@test.com'], message: 'test message', moderator: true}
    return createInvitation(user.id, community.id, data)
    .then((ret) => expect(ret.invitations).to.have.lengthOf(2))
  })
})
